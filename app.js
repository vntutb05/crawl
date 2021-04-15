
const { priceFormat,materialsFormat,imageUriFormat,indexCate} = require('./helper');
const Crawler = require('crawler');
const https = require('https');
const fs = require('fs');
const rp = require("request-promise");
const cheerio = require("cheerio");
const slug = require('slug');
const path = require('path');
var data;
// connect mysql
var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "crawl"
});


// Crawl
const c = new Crawler({
    maxConnections: 10,
    // This will be called for each crawled page
     callback: async(error, res, done) => {
        if (error) {
            console.log(error);
        } else {
            const $ = res.$;
            // $ is Cheerio by default
            //a lean implementation of core jQuery designed specifically for the server
            let name=$('h1.wt-line-height-tight').text().trim();
            let price =priceFormat(($('p.wt-text-title-03').text()).trim()); 
            let description=$('p.wt-text-body-01.wt-break-word').text().trim();
            let meterials=materialsFormat($('span.wt-text-body-01').text().trim());
            let image=$('img.carousel-image');
            let slugProduct= slug(name,'_');
             await fs.exists(path.join(__dirname, `uploads/${slugProduct}`), exists => {
                if(!exists){
                     fs.mkdirSync(path.join(__dirname, `uploads/${slugProduct}`));
                }
              });
           
            for(let i=0;i<image.length;i++){
                let imageUri=image[i].attribs['data-src-zoom-image'];
                let imageName =imageUriFormat(imageUri);
                setTimeout(async function(){
                    const file = await fs.createWriteStream(`uploads/${slugProduct}/${imageName}`);
                    const request = await https.get(`${imageUri}`, function(response) { 
                        response.pipe(file);
                    });
                },1000);
               
              
            } 
            data={
              name:name,
              slug:slugProduct,
              price:Number(price),
              description:String(description),
              meterial:meterials,
              cate_id:title
            }
            
            con.connect(function(err) {
              console.log("Connected!");
            });
              
               con.query(`SELECT * FROM product WHERE slug="${slugProduct}"`, async function (error, results, fields) {
                if( results.length ==0){
                   await con.query('INSERT INTO product SET ?', data, function (error, results, fields) {
               
                  });
                }
              });
            
          }
       
          
        done();
        
        //  await fs.writeFileSync('data.json', JSON.stringify(data))
    }
});

let title ;
const URL = `https://www.etsy.com/c/clothing/mens-clothing/shirts-and-tees?ref=pagination&page=2`;
 
const options = {
  uri: URL,
  transform: function (body) {
    //Khi lấy dữ liệu từ trang thành công nó sẽ tự động parse DOM
    return cheerio.load(body);
  },
};
 
(async function crawler() {
  try {
    // Lấy dữ liệu từ trang crawl đã được parseDOM
    var $ = await rp(options);
  } catch (error) {
    return error;
  }
 

 
  /* Phân tích các table và sau đó lấy các posts.
     Mỗi table là một chương 
  */  
     
    //Tìm bài viết ở mỗi chương
    let chaperData = []
    const chaperLink = $("a.listing-link")
    
    for (let j = 0; j < chaperLink.length; j++) {
        const post = $(chaperLink[j]);
        const postLink = post.attr("href");
        title= slug(indexCate($('title').text()),'_');
        chaperData.push(postLink)
        c.queue(chaperData);
    }
})();
// 
// Queue just one URL, with default callback
//  c.queue(['https://www.etsy.com/listing/832041720/personalised-leather-bookmark-third?ga_order=most_relevant&ga_search_type=all&ga_view_type=gallery&ga_search_query=&ref=sc_gallery-1-1&plkey=fef202ba871076504ff86667bf240cc05a862520%3A832041720&bes=1','https://www.etsy.com/listing/539242471/solid-oak-personalised-bookend-bookworm?ga_order=most_relevant&ga_search_type=all&ga_view_type=gallery&ga_search_query=&ref=sc_gallery-1-2&plkey=8387aa5c1197d4bde9a8f3ec05279352fb584471%3A539242471&etp=1'])
