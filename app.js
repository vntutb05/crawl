const {priceFormat, materialsFormat, imageUriFormat, indexCate} = require('./helper');
const Crawler = require('crawler');
const https = require('https');
const fs = require('fs');
const rp = require("request-promise");
const cheerio = require("cheerio");
const slug = require('slug');
const path = require('path');
const sharp = require('sharp');
var data;
// connect mysql
var mysql = require('mysql');

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "05052000",
    database: "product"
});


// Crawl
const c = new Crawler({
    maxConnections: 10000,
    rateLimit: 100,
    // This will be called for each crawled page
    callback: async (error, res, done) => {
        if (error) {
            console.log(error);
        } else {
            const $ = res.$;
            // $ is Cheerio by default
            //a lean implementation of core jQuery designed specifically for the server
            let name = $('div.title>h1').text().trim();
            let slugProduct = slug(name, '-');

            let price = priceFormat(($('div.pricelist>span.originalprice').text()).trim());
            let priceSale = priceFormat(($('div.pricelist>span.pricetext').text()).trim());
            let description = $('div.description').html().trim();

            let image = $('div.photolist > ul> li  > img')
            let sizes = $('#size-form-list> li> a')
            let cate = $('div.path>a')[3].children[0].data
            let cateParent = $('div.path>a')[2].children[0].data

            let images = ''
            for (let i = 0; i < image.length; i++) {
                let imageUri = image[i].attribs['src'];
                if (images == '') {
                    images += imageUri;
                } else {
                    images += ` , ${imageUri}`
                }
            }

            let sizesStr = ''
            for (let i = 0; i < sizes.length; i++) {
                const size = sizes[i].attribs['title']
                if (sizesStr == '') {
                    sizesStr += size;
                } else {
                    sizesStr += ` , ${size}`
                }
            }

            data = {
                name,
                slug: slugProduct,
                category: cate,
                category_parent: cateParent,
                price: parseInt(price),
                price_sale: parseInt(priceSale),
                description,
                images,
                sizes: sizesStr
            }

            con.connect(function (err) {
                if (!err) {
                    console.log('success')
                }
            });
            let count
            con.query(`SELECT * FROM product WHERE slug = "${slugProduct}"`, async function (error, results, fields) {
                count = results.length
                console.log(count)
                setTimeout(function () {
                    if (count === 0) {
                        con.query('INSERT INTO product SET ?', data, function (error, _results, fields) {
                            console.log(error)
                        });
                    }
                })
            })


        }


        done();

        //  await fs.writeFileSync('data.json', JSON.stringify(data))
    }
});


for (let i = 480; i < 513; i++) {
    const URL = `https://www.mypurseshop.ru/products-p-${i}.html`
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
        const chaperLink = $("div.productlist>table>tbody>tr>td>dl>dt>a")
        for (let j = 0; j < chaperLink.length; j++) {
            const post = $(chaperLink[j]);
            const postLink = post.attr("href");
            chaperData.push(postLink)
            if (j == chaperLink.length - 1) {
                c.queue(chaperData);
            }
        }
    })();
}


//
// Queue just one URL, with default callback
//  c.queue(['https://www.etsy.com/listing/832041720/personalised-leather-bookmark-third?ga_order=most_relevant&ga_search_type=all&ga_view_type=gallery&ga_search_query=&ref=sc_gallery-1-1&plkey=fef202ba871076504ff86667bf240cc05a862520%3A832041720&bes=1','https://www.etsy.com/listing/539242471/solid-oak-personalised-bookend-bookworm?ga_order=most_relevant&ga_search_type=all&ga_view_type=gallery&ga_search_query=&ref=sc_gallery-1-2&plkey=8387aa5c1197d4bde9a8f3ec05279352fb584471%3A539242471&etp=1'])
