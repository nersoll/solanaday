// js/add.js
(function(){
  const $ = (id) => document.getElementById(id);
  const form = $("form");
  const imageInput = $("image");
  const preview = $("preview");

  function readAsDataURL(file){
    return new Promise((resolve, reject)=>{
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  imageInput.addEventListener('change', async (e)=>{
    const f = e.target.files?.[0];
    if (!f) { preview.src = ''; return; }
    const url = await readAsDataURL(f);
    preview.src = url;
  });

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();

    const name = $("name").value.trim();
    const symbol = $("symbol").value.trim();
    const price = Number($("price").value);
    const quantity = Number($("quantity").value);
    const mint = $("mint").value.trim();
    const decimalsRaw = $("decimals").value.trim();
    const decimals = decimalsRaw ? Number(decimalsRaw) : undefined;
    const description = $("description").value.trim();
    const file = imageInput.files?.[0];

    if (!name || !file || !(price>=0) || !(quantity>=0)){
      alert("Заполни *название*, *цену*, *количество* и приложи *изображение*.");
      return;
    }

    const imageDataUrl = await readAsDataURL(file);

    const token = {
      id: DataAPI.uid(),
      source: 'user',
      createdAt: Date.now(),
      name, symbol, price, quantity,
      mint: mint || undefined,
      decimals,
      description,
      imageDataUrl
    };

    DataAPI.saveUserToken(token);
    alert('Монета сохранена! Переходим на витрину.');
    window.location.href = 'index.html';
  });

  $("clear").addEventListener('click', ()=>{
    form.reset();
    preview.src = '';
  });
})();
