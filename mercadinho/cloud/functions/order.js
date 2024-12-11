//Modelos
const Order = Parse.Object.extend('Order');
const OrderItem = Parse.Object.extend('OrderItem');

const product = require('./product');

var options = {
  sandbox: false,
	client_id: 'Client_Id_ce2e1cd4749e40b943247def3fba246fb8c23275',
	client_secret: 'Client_Secret_f03b9a91929b574b46bb6671fd20acc9577eb808',
	certificate: 'homologacao-659198-mercadinho.p12',
};

const efipay = new EfiPay(options);


// Função de checkout
Parse.Cloud.define('checkout', async (req) => {
    if (req.user == null) throw 'INVALID_USER';
  
    const queryCartItems = new Parse.Query(CartItem);
    queryCartItems.equalTo('user', req.user);
    queryCartItems.include('product');
  
    const resultCartItems = await queryCartItems.find({ useMasterKey: true });
  
    let total = 0;
    for (let item of resultCartItems) {
      item = item.toJSON();
      total += item.quantity * item.product.price;
    }
  
    // Verifique se req.params.total existe e é um número antes de aplicar toFixed()
    if (req.params.total === undefined || isNaN(req.params.total)) {
      throw 'INVALID_TOTAL';
    }
  
    // Arredondar o total para 2 casas decimais mantendo-o como um número
    total = Math.round(total * 100) / 100;  // Total calculado (arredondado para 2 casas decimais)
    const requestedTotal = Math.round(parseFloat(req.params.total) * 100) / 100;  // Total recebido na requisição, arredondado
  
    // Se os totais não coincidirem, lançar erro
    if (requestedTotal !== total) {
      throw 'INVALID_TOTAL';
    }
  
    const order = new Order();
    order.set('total', total);  // Agora 'total' é um número, não uma string
    order.set('user', req.user);
    const savedOrder = await order.save(null, {useMasterKey: true});
  
    // Salvar os itens do pedido
    for (let item of resultCartItems) {
      const orderItem = new OrderItem();
      orderItem.set('order', savedOrder);
      orderItem.set('product', item.get('product'));
      orderItem.set('user', req.user);
      orderItem.set('quantity', item.get('quantity').toString());  // Aqui convertendo para String
      orderItem.set('price', item.toJSON().product.price);
      await orderItem.save(null, {useMasterKey: true});
    }
  
    await Parse.Object.destroyAll(resultCartItems, {useMasterKey: true});
  
    return {
      id: savedOrder.id
    };
  });
  
  // Lendo Pedido do Usuario
  Parse.Cloud.define('get-orders', async (req) => {
    if (req.user == null) throw 'INVALID_USER';
  
    const queryOrders = new Parse.Query(Order);
    queryOrders.equalTo('user', req.user); // Filtra os pedidos para o usuário logado
    const resultOrders = await queryOrders.find({ useMasterKey: true });
  
    return resultOrders.map(function(o) {
      o = o.toJSON(); // Converte o objeto Parse para um objeto JSON
      return {
        id: o.objectId,
        total: o.total,
        createdAt: o.createdAt
      };
    });
  });
  
  // Função para obter itens do pedido
  Parse.Cloud.define('get-orders-items', async (req) => {
    if (req.user == null) throw 'INVALID_USER';
    if (req.params.orderId == null) throw 'INVALID_ORDER';
  
    const order = new Order();
    order.id = req.params.orderId;
  
    const queryOrderItems = new Parse.Query('OrderItem');
    queryOrderItems.equalTo('order', order);
    queryOrderItems.equalTo('user', req.user);
    queryOrderItems.include('product');
    queryOrderItems.include('product.category'); // Corrigido: 'product-category' para 'product.category'
    
    const resultOrderItems = await queryOrderItems.find({ useMasterKey: true });
  
    return resultOrderItems.map(function (o) {
      o = o.toJSON();
      return {
        id: o.objectId,
        quantity: o.quantity,
        price: o.price,
        product: product.formatProduct(o.product) // Formatação do produto
      };
    });
  });

function createCharge(dueSeconds,cpf,fullname,price) {
  const EfiPay = require('sdk-node-apis-efi')
const options = require('../../credentials')

let body = {
	"calendario": {
		"expiracao": dueSeconds,
	},
	"devedor": {
		"cpf": cpf.replace(/\D/g,''),
		"nome": fullname,
	},
	"valor": {
		"original": price.tofixed(2),
	},
	chave: 'SUACHAVEPIX', // Informe sua chave Pix cadastrada na efipay.	//o campo abaixo é opcional
}

let params = {
	txid: 'dt9BHlyzrb5jrFNAdfEDVpHgiOmDbVq111',
}
const efipay = new EfiPay(options)

// O método pixCreateImmediateCharge indica os campos que devem ser enviados e que serão retornados
efipay.pixCreateImmediateCharge({}, body)
	.then((resposta) => {
		console.log(resposta) // Aqui você tera acesso a resposta da API e os campos retornados de forma intuitiva
	})
	.catch((error)=> {
		console.log(error)
	})