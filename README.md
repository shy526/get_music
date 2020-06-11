# get_music


## 待解决问题

[x] xiami音乐反爬虫限制

## api

### 音乐源获取
- http://localhost:3000/music/source
 - `["netease_music","qq_music","xiami_music"]`
 
### 歌曲检索
- http://localhost:3000/music/search?pageNumber={pageNumber}pageSize={pageSize}&word={word}&source={source}

### 播放源获取
- http://localhost:3000/music/pay/{source}/{id}
