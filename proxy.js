const axios = require("axios")
const cheerio = require('cheerio')
let app = {
    checkProxy: () => {
        let page = 1

        for (page = 2; page < 100;page++) {
            let url = `http://www.89ip.cn/index_${page}.html`
            axios.get(url).then(rep => {
                let $ = cheerio.load(rep.data);
                $("tbody tr").each( function (index, element) {
                    let ip = $("td", element).eq(0).text().trim();
                    let port = $("td", element).eq(1).text().trim();
                    if (!ip||!port){
                        return
                    }

                    axios.get("http://www.baidu.com/", {
                        proxy: {
                            ip: ip,
                            port: port
                        }
                    }).then(rep => {
                        if (rep.status===200){
                            console.log(`==>${ip}:${port}<==`)
                        }

                    }).catch(e => {
                    });

                })

            }).then(e=>{})
        }

    }
}
app.checkProxy()
module.exports = app;

