# DSH 壁纸插件（dsh-wallpaper）

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 换壁纸的插件。把你自己电脑上的壁纸（图片或视频）铺到 DSH 界面的最底层，每次启动随机挑一张。
右下角有个小圆钮，点开能挑、能勾几张做随机池。

## 装

1. 把这个仓库放到你想放的位置，比如 `D:/plugins/dsh-wallpaper`
2. 打开 DSH 的 profile 目录（`~/.dsh/profiles/<profile>/package.json`，Windows 上是 `C:\Users\<你>\.dsh\profiles\<profile>\package.json`），在 `dependencies` 里加一行：

   ```json
   "dsh-wallpaper": "file:D:/plugins/dsh-wallpaper"
   ```

3. 在同一个文件的 `dsh.profile.bundles` 数组里加上 `"dsh-wallpaper"`
4. 在 profile 目录里跑一次 `pnpm install`，重启 DSH

## 配置

配置文件在 `~/.dsh/dsh-wallpaper/config.json`，插件跑起来会自己生成。改完存盘、刷新页面就生效。

| 字段 | 说明 |
| --- | --- |
| `scanDirs` | 去哪些目录找壁纸。默认会往几个常见的 Steam 安装位置找 Wallpaper Engine 的订阅壁纸（`steamapps/workshop/content/431960`）。自己的图放别处，就把目录写在这儿。 |
| `items` | 手动指定的壁纸列表（`{id, file, name}`），扫描扫不到的可以用它兜底 |
| `mode` | `random` 每次启动随机一张 / `fixed` 固定某一张 |
| `fixedId` | `mode` 是 `fixed` 时用哪张 |
| `dim` | 变暗程度，0～1，0 就是原样 |
| `blur` | 模糊半径，0 就不模糊 |

## 右下角那个圆钮

- 点一下展开壁纸缩略图
- 直接点某张：只留它一张，立马换
- 点卡片右上角的圈：勾进随机池（可以勾好几张），每次开 DSH 从池子里随机
- 「换一张」：从池子里随机换一张看看
- 「重扫」：新订阅了壁纸，点它重新扫目录，不用重启

## 挑壁纸的口味

Wallpaper Engine 的目录里混着一堆不是壁纸的东西——素材图、封面、幻灯片底图、同一张图的三种分辨率。默认会跳过这些：

- 跳过 `background` / `cover` / `materials` / `textures` / `sprites` / `fonts` / `sounds` / `scripts` / `shaders` / `particles` / `effects` 这些目录
- 跳过文件名里带 `spritesheet` / `sprite` / `trail` / `mask` / `texture` / `loading` / `logo` / `icon` / `thumb` 的
- `2k` / `4k` / `8k` / `1080p` / `1440p` / `2160p` / `720p` 这种按分辨率分的目录，只留体积最大的那一份
- `preview.jpg` 是缩略图，不算壁纸
- 名字优先读 `project.json` 里的 `title`

## 许可

MIT