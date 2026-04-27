// 印刷カート — 複数カードをまとめて印刷するための一時保存

function getCart() {
  try { var r = localStorage.getItem(LS_CART); return r ? JSON.parse(r) : []; }
  catch(e) { return []; }
}

function saveCart(items) {
  try { localStorage.setItem(LS_CART, JSON.stringify(items)); } catch(e) {}
}

function addToCart(cardId, data) {
  var cart = getCart();
  var id = 'cart_' + Date.now();
  cart.push({ id: id, cardId: cardId, addedAt: new Date().toISOString(), data: data });
  saveCart(cart);
  return id;
}

function removeFromCart(id) {
  saveCart(getCart().filter(function(x){ return x.id !== id; }));
}

function clearCart() {
  saveCart([]);
}
