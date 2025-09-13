import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@project-serum/anchor";

const network = "https://api.devnet.solana.com";
const connection = new Connection(network, "processed");

const programID = new PublicKey("BjerAfpSVqNzVgTQPgDMmQsR19MuMHoLGiR7LsMHWFU");
const SYSTEM_PROGRAM = new PublicKey("11111111111111111111111111111111");
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const RENT = new PublicKey("SysvarRent111111111111111111111111111111111");
const ASSOCIATED_TOKEN_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

let provider, program, mintPubkey, ataPubkey;

async function loadProgram() {
  const idl = await fetch("myproject.json").then((res) => res.json());
  provider = new AnchorProvider(connection, window.solana, {
    preflightCommitment: "processed",
  });
  program = new Program(idl, programID, provider);
}

async function createToken() {
  try {
    mintPubkey = anchor.web3.Keypair.generate();

    const tx = await program.methods
      .createToken()
      .accounts({
        mint: mintPubkey.publicKey,
        artist: provider.wallet.publicKey,
        systemProgram: SYSTEM_PROGRAM,
        tokenProgram: TOKEN_PROGRAM,
        rent: RENT,
      })
      .signers([mintPubkey])
      .rpc();

    ataPubkey = await createATA(mintPubkey.publicKey, provider.wallet.publicKey);
    console.log("Mint:", mintPubkey.publicKey.toString());
    console.log("ATA:", ataPubkey.toString());
    console.log("Tx:", tx);
  } catch (err) {
    console.error(err);
  }
}

async function createATA(mint, owner) {
  const ata = await anchor.utils.token.associatedAddress({ mint, owner });

  try {
    const ix = anchor.utils.token.createAssociatedTokenAccountInstruction(
      provider.wallet.publicKey,
      ata,
      owner,
      mint,
      TOKEN_PROGRAM,
      ASSOCIATED_TOKEN_PROGRAM
    );

    const tx = new anchor.web3.Transaction().add(ix);
    await provider.sendAndConfirm(tx);
  } catch (e) {
    if (!e.message.includes("already in use")) throw e;
  }

  return ata;
}

async function mintTokens(amount) {
  if (!mintPubkey || !ataPubkey) {
    console.error("Call createToken() first");
    return;
  }

  try {
    const tx = await program.methods
      .mintTokens(new anchor.BN(amount))
      .accounts({
        mint: mintPubkey.publicKey,
        artist: provider.wallet.publicKey,
        artistTokenAccount: ataPubkey,
        tokenProgram: TOKEN_PROGRAM,
      })
      .rpc();

    console.log(`Minted ${amount} tokens`);
    console.log("Tx:", tx);
  } catch (err) {
    console.error(err);
  }
}

window.onload = async () => {
  if (window.solana) {
    await window.solana.connect();
    await loadProgram();
  } else {
    alert("Please install Phantom Wallet!");
  }
};

window.createToken = createToken;
window.mintTokens = mintTokens;
