// Modelos
const Product = Parse.Object.extend("Product");
const CartItem = Parse.Object.extend("CartItem");

const product = require('./product');

// Função para adicionar item ao carrinho
Parse.Cloud.define('add-item-to-cart', async (req) => {
    if (req.user == null) throw 'INVALID_USER';
    if (!req.params.quantity) throw 'INVALID_QUANTITY';
    if (!req.params.productId) throw 'INVALID_PRODUCT';
  
    const cartItem = new CartItem();
    cartItem.set('quantity', req.params.quantity);
  
    const product = new Product();
    product.id = req.params.productId;
  
    cartItem.set('product', product);
    cartItem.set('user', req.user);
  
    const savedItem = await cartItem.save(null, { useMasterKey: true });
    return {
      id: savedItem.id,
    };
  });
  
  // Função para modificar a quantidade de um item no carrinho
  Parse.Cloud.define('modify-item-quantity', async (req) => {
    if (!req.params.cartItemId) throw 'INVALID_CART_ITEM';
    if (req.params.quantity == null || isNaN(req.params.quantity)) throw 'INVALID_QUANTITY';
  
    const cartItem = new CartItem();
    cartItem.id = req.params.cartItemId;
  
    // Verifica se a quantidade é maior que 0
    if (req.params.quantity > 0) {
      cartItem.set('quantity', req.params.quantity);
      await cartItem.save(null, { useMasterKey: true });
    } else if (req.params.quantity === 0) {
      // Se a quantidade for 0, remove o item do carrinho
      await cartItem.destroy(null, { useMasterKey: true });
    } else {
      throw 'INVALID_QUANTITY'; // Caso a quantidade seja negativa ou inválida
    }
  });
  
  // Função para obter os itens do carrinho do usuário
  Parse.Cloud.define("get-cart-items", async (req) => {
    if (req.user == null) throw 'INVALID_USER';
  
    const queryCartItems = new Parse.Query(CartItem);
    queryCartItems.equalTo('user', req.user);
    queryCartItems.include('product');
    queryCartItems.include('product.category');
  
    const resultCartItems = await queryCartItems.find({ useMasterKey: true });
  
    return resultCartItems.map(function (c) {
      c = c.toJSON();
      return {
        id: c.objectId,
        quantity: c.quantity,
        product: product.formatProduct(c.product)
      };
    });
  });
