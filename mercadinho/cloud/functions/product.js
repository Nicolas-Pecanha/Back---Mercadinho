// Modelos
const Product = Parse.Object.extend("Product");
const Category = Parse.Object.extend("Category");
const CartItem = Parse.Object.extend("CartItem");
const Order = Parse.Object.extend('Order');
const OrderItem = Parse.Object.extend('OrderItem');

// Função para retornar produtos formatados
function formatProduct(productJson) {
  return {
    id: productJson.objectId,
    title: productJson.title,
    description: productJson.description,
    price: productJson.price,
    unit: productJson.unit,
    picture: productJson.picture ? productJson.picture.url : null,
    category: productJson.category ? {
      title: productJson.category.title,
      id: productJson.category.objectId
    } : null
  };
}

// Função para obter a lista de produtos
Parse.Cloud.define("get-product-list", async (req) => {
  const queryProducts = new Parse.Query(Product);

  // Condições de pesquisa
  if (req.params.title != null) {
    queryProducts.fullText("title", req.params.title);
  }

  if (req.params.categoryId != null) {
    const category = new Category();
    category.id = req.params.categoryId;
    queryProducts.equalTo("category", category);
  }

  const itemsPerPage = req.params.itemsPerPage || 2;
  if (itemsPerPage > 100) throw "Quantidade inválida de itens por página";

  const page = req.params.page || 1;
  queryProducts.skip(itemsPerPage * (page - 1)); // Corrigido para começar a partir da página 1
  queryProducts.limit(itemsPerPage);
  queryProducts.include("category");

  const resultProducts = await queryProducts.find({ useMasterKey: true });

  return resultProducts.map(function (p) {
    p = p.toJSON();
    return formatProduct(p);
  });
});

// Função para obter a lista de categorias
Parse.Cloud.define("get-category-list", async (req) => {
  const queryCategories = new Parse.Query(Category);
  const resultCategories = await queryCategories.find({ useMasterKey: true });

  return resultCategories.map(function (c) {
    c = c.toJSON();
    return {
      title: c.title,
      id: c.objectId
    };
  });
});

module.exports ={formatProduct};