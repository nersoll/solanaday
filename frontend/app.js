// --- жёсткие проверки загрузки глобалей ---
if (typeof window.solanaWeb3 === "undefined") {
  throw new Error("web3.js не загрузился");
}
if (typeof window.anchor === "undefined") {
  throw new Error("anchor.iife не загрузился");
}

const { Connection, PublicKey, Keypair, Transaction } = window.solanaWeb3;
const anchor = window.anchor;
const { BN } = anchor;

const network = "https://api.devnet.solana.com";
const connection = new Connection(network, "processed");

const PROGRAM_ID = new PublicKey("BjerAfpSVqNzVgTQPgDMmQsR19MuMHoLGiR7LsMHWFU");
const SYSTEM_PROGRAM = new PublicKey("11111111111111111111111111111111");
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const RENT = new PublicKey("SysvarRent111111111111111111111111111111111");
const ASSOCIATED_TOKEN_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

// состояние
let phantomProvider = null;
let provider = null;
let program = null;
let mintKeypair = null;
let artistATA = null;

const $ = (id) => document.getElementById(id);
const log = (m) => { const el = $("log"); el.textContent += "\n" + m; el.scrollTop = el.scrollHeight; };

// ---- провайдер phantom ----
function getPhantom() {
  return window.solana ?? window.phantom?.solana ?? null;
}

async function ensureConnected() {
  if (document.readyState !== "complete") {
    await new Promise((r) => window.addEventListener("load", r, { once: true }));
  }
  phantomProvider = getPhantom();
  if (!phantomProvider?.isPhantom) {
    alert("Phantom не найден...");
    throw new Error("Phantom not found");
  }

  await phantomProvider.connect();
  provider = new anchor.AnchorProvider(connection, phantomProvider, { preflightCommitment: "processed" });
  anchor.setProvider(provider);


  // загрузим IDL
  if (!program) {
    const idl = await fetch("myproject.json").then((r) => r.json());
    program = new anchor.Program(idl, PROGRAM_ID, provider);
  }
  $("wallet-status").textContent = "Кошелёк: " + phantom.publicKey.toBase58();
  log("Phantom: " + phantom.publicKey.toBase58());
}

// ---- ATA helpers (через anchor.utils.token) ----
async function getATA(mint, owner) {
  return anchor.utils.token.associatedAddress({ mint, owner });
}

async function ensureATA(owner, mint) {
  const ata = await getATA(mint, owner);
  const ix = anchor.utils.token.createAssociatedTokenAccountInstruction(
    provider.wallet.publicKey, // payer
    ata,
    owner,
    mint,
    TOKEN_PROGRAM,
    ASSOCIATED_TOKEN_PROGRAM
  );
  try {
    const tx = new Transaction().add(ix);
    await provider.sendAndConfirm(tx);
    log(`Создан ATA: ${ata.toBase58()}`);
  } catch (e) {
    const msg = String(e?.message || "");
    if (!msg.includes("already in use")) {
      throw e;
    } else {
      log(`ATA уже существует: ${ata.toBase58()}`);
    }
  }
  return ata;
}

// ---- 1) создать токен (mint) ----
async function onCreateToken() {
  await ensureConnected();
  mintKeypair = Keypair.generate();

  const sig = await program.methods
    .createToken()
    .accounts({
      mint: mintKeypair.publicKey,
      artist: provider.wallet.publicKey,
      systemProgram: SYSTEM_PROGRAM,
      tokenProgram: TOKEN_PROGRAM,
      rent: RENT,
    })
    .signers([mintKeypair])
    .rpc();

  log("create_token tx: " + sig);
  $("mint-address").textContent = mintKeypair.publicKey.toBase58();

  // создадим твой ATA
  artistATA = await ensureATA(provider.wallet.publicKey, mintKeypair.publicKey);
  $("artist-ata").textContent = artistATA.toBase58();
}

// ---- 2) минт себе (через метод программы mint_tokens) ----
async function onMintToSelf() {
  if (!mintKeypair) { alert("Сначала создайте токен"); return; }
  await ensureConnected();
  if (!artistATA) {
    artistATA = await ensureATA(provider.wallet.publicKey, mintKeypair.publicKey);
    $("artist-ata").textContent = artistATA.toBase58();
  }
  const amount = Number($("mint-amount").value || "0");
  if (!(amount >= 0)) { alert("Некорректное количество"); return; }

  const sig = await program.methods
    .mintTokens(new BN(amount))
    .accounts({
      mint: mintKeypair.publicKey,
      artist: provider.wallet.publicKey,
      artistTokenAccount: artistATA,
      tokenProgram: TOKEN_PROGRAM,
    })
    .rpc();

  log(`mint_tokens ${amount} → tx: ${sig}`);
  await refreshBalances();
}

// ---- 3) перевести человеку (SPL transfer) ----
async function onTransferToRecipient() {
  if (!mintKeypair) { alert("Сначала создайте токен"); return; }
  await ensureConnected();

  const recipientStr = $("recipient").value.trim();
  const amount = Number($("transfer-amount").value || "0");
  if (!recipientStr) { alert("Введите адрес получателя"); return; }
  if (!(amount > 0)) { alert("Введите положительное количество"); return; }

  const recipient = new PublicKey(recipientStr);

  // убедимся, что есть твой ATA и ATA получателя
  if (!artistATA) {
    artistATA = await ensureATA(provider.wallet.publicKey, mintKeypair.publicKey);
    $("artist-ata").textContent = artistATA.toBase58();
  }
  const recipientATA = await ensureATA(recipient, mintKeypair.publicKey);

  // строим SPL transfer
  const ix = anchor.utils.token.createTransferInstruction(
    artistATA,
    recipientATA,
    provider.wallet.publicKey, // owner (ты)
    amount,
    [],
    TOKEN_PROGRAM
  );
  const tx = new Transaction().add(ix);
  const sig = await provider.sendAndConfirm(tx);
  log(`transfer ${amount} → ${recipient.toBase58()} | tx: ${sig}`);
  await refreshBalances();
}

// ---- 4) показать балансы (упрощённо) ----
async function getTokenBalance(ataPubkey) {
  try {
    const info = await connection.getTokenAccountBalance(ataPubkey);
    return info?.value?.uiAmountString ?? "0";
  } catch { return "0"; }
}

async function refreshBalances() {
  if (!mintKeypair || !artistATA) {
    $("artist-balance").textContent = "—";
    $("recipient-balance").textContent = "—";
    return;
  }
  const artistBal = await getTokenBalance(artistATA);
  $("artist-balance").textContent = artistBal;

  const recStr = $("recipient").value.trim();
  if (recStr) {
    try {
      const recipientATA = await getATA(mintKeypair.publicKey, new PublicKey(recStr));
      const recBal = await getTokenBalance(recipientATA);
      $("recipient-balance").textContent = recBal;
    } catch {
      $("recipient-balance").textContent = "—";
    }
  }
}

// ---- wiring UI ----
window.addEventListener("load", () => {
  $("btn-connect").onclick = ensureConnected;
  $("btn-create").onclick = onCreateToken;
  $("btn-mint").onclick = onMintToSelf;
  $("btn-transfer").onclick = onTransferToRecipient;
  $("btn-refresh").onclick = refreshBalances;
  log("Готово.");
});
