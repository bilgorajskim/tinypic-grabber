# Tinypic grabber

Alternative approach. Instead of brute forcing through IDs all the time, it requests some initial view.php?pic=random&s=random and discovers new ones by following "next" button. This improves efficiency, since "next" is very likely to lead to an image that exists.

It's running on node.js but it could be adapted to work in browsers.

## Running

```
yarn
node index.js ./data
```

## TODO

- Implement grabbing videos
- Split into "search" and "download" nodes
- Implement tracker