var express = require('express');
var router = express.Router();
let fs=require("fs")
let path=require("path")
let music={
  source:[]
};
!function(){
  let musicRoot = path.join(path.resolve(__dirname,".."),"service");
  fs.readdirSync(musicRoot).forEach(item=>{
    let musicPath = path.join(musicRoot,item);
    let te = require(musicPath);
    let sourceName = path.parse(musicPath).name;
    music[sourceName]=te
    music.source.push(sourceName)
  })
}()
console.log(`现已装载=>>平台${music.source}`)

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/search',async function(req, res, next) {
  try {
    let {pageSize,pageNumber,word,source} = req.query;
    let musicSource=source? music[source]:music[music.source[0]]
    if (!musicSource) {
      res.send(`${source}没有被加载`)
    }else {
      res.send( await musicSource.selectMusic(pageNumber,pageSize,word));
    }
  }catch (e) {
    console.log(e)
  }


});

router.get(`/pay/:source/:id`,async function(req, res, next) {
  try {
    let {id,source} = req.params;
    let musicSource = music[source];
    if (!musicSource){
      res.send(`${source}没有被加载`)
    }else {
      res.send(await musicSource.getMusicUrl(id))
    }
  }catch (e) {
    console.log(e)
  }

})

router.get(`/lyric/:source/:id`,async function(req, res, next) {
  try {
    let {id,source} = req.params;
    let musicSource = music[source];
    if (!musicSource){
      res.send(`${source}没有被加载`)
    }else {
      res.send(await musicSource.getLyric(id))
    }
  }catch (e) {
    console.log(e)
  }

})

router.get(`/source`,(req,res,next)=>{
  res.send( music.source)
})






module.exports = router;
