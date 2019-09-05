# Tinypic grabber

Alternative approach. Instead of brute forcing through IDs all the time, it requests some initial view.php?pic=random&s=random and discovers new ones by following "next" button. This improves efficiency, since "next" is very likely to lead to an image that exists.

It's running on node.js but it could be adapted to work in browsers.

## Install deps

```
npm install
```
or
```
yarn
```

## Run it

```
node index.js ./data
```

(you can spawn a dozen processes to parallelize it)

## TODO

- Implement grabbing videos
- Split into "search" and "download" nodes
- Implement tracker