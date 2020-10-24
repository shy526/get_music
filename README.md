# get_music



## api

### 问题
[x] xiami music 反爬虫

### 可用音乐源获取
- http://localhost:3000/music/source
 - `["netease_music","qq_music","xiami_music"]`
 
### 歌曲检索
- http://localhost:3000/music/search?pageNumber={pageNumber}&pageSize={pageSize}&word={word}&source={source}
  - pageNumber 页码
  - pageSize 记录数
  - source 音乐源
  - word 关键字

### 播放源获取
- http://localhost:3000/music/pay/{source}/{id}
  - source 音乐源
  - id 音乐源所对应的Id

## 没时间搞了,弃坑
- js代码写的烂 emmmmmmm
