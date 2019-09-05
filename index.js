const fetch = require("node-fetch");
const mime = require("mime-types");

const outDir = process.argv[2];
const initialServer = process.argv[3];
const initialId = process.argv[4];

const MAX_TRIES = 20;
const SLEEP_TIME = 2000;
const TIMEOUT = 15000;
const FORCE_SERVER = null; // change to 1-9 to always grab from specific server

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function grab(id, server) {
    let resp = null;

    for (let tries = 0; tries < MAX_TRIES; tries++) {
        console.log("Try fetch", tries);
        try {
            resp = await fetch(`http://tinypic.com/view.php?pic=${id}&s=${server}`, {
                timeout: TIMEOUT,
                redirect: "manual"
            });
        }
        catch (err) {
            console.log("fetch error");
            await sleep(SLEEP_TIME);
            continue;
        }
        if (resp.status === 302) {
            throw new Error("Image does not exist (302 redirect)");
        }
        if (resp.status !== 200) {
            console.log("status != 200", resp.status, resp.statusText);
            await sleep(SLEEP_TIME);
            continue;
        }
        break;
    }
    if (!resp) {
        throw new Error("Failed to fetch");
    }

    const html = await resp.text();
    
    const imgRegex = /<a href="(.*)" class="thickbox">/;
    const imgMatch = html.match(imgRegex);
    if (imgMatch === null) {
        console.log(html);
        throw new Error("Broken HTML?");
    }
    const imgUrl = imgMatch[1];
    if (!imgUrl) {
        throw new Error("Broken HTML");
    }

    const nextRegex = /<li class="next"><a href="http:\/\/tinypic.com\/view.php\?pic=(.*)&#38;s=([0-9]+)"/;
    const next = html.match(nextRegex);
    const nextId = decodeURIComponent(next[1]);
    const nextServer = next[2];
    if (!nextId || !nextServer) {
        throw new Error("Broken HTML");
    }

    console.log("next will be:", nextId, nextServer);

    if (checkDuplicate(server, id)) {
        return null;
    }

    for (let tries = 0; tries < MAX_TRIES; tries++) {
        try {
            console.log("Try dl", tries);
            const dlResponse = await fetch(imgUrl, {
                timeout: TIMEOUT
            });
            const bytes = await dlResponse.arrayBuffer();
            const contentType = dlResponse.headers.get("content-type");
            let ext = mime.extension(contentType) || "jpg";
            // Videos
            if (contentType === "application/octet-stream") {
                ext = "flv";
            }
            if (ext === "html") {
                continue;
            }
            saveImage(server, id, ext, bytes);
            return {
                ok: true,
                next: {
                    id: nextId,
                    server: nextServer
                }
            };
        } catch (err) {
        }
        await sleep(SLEEP_TIME);
    }
    return {
        ok: false,
        next: {
            id: nextId,
            server: nextServer
        }
    };
}

/*
    It checks if we already have an image saved locally.
    It should query a tracker instead..
*/
function checkDuplicate(server, id) {
    const fs = require("fs");
    const serverDir = `${outDir}/${server}`;
    return fs.existsSync(`${serverDir}/${id}.jpeg`) ||
    fs.existsSync(`${serverDir}/${id}.jpg`) ||
    fs.existsSync(`${serverDir}/${id}.png`) ||
    fs.existsSync(`${serverDir}/${id}.gif`) || 
    fs.existsSync(`${serverDir}/${id}.flv`);
}

function saveImage(server, filename, ext, bytes) {
    const fs = require("fs");
    const buffer = Buffer.from(bytes);
    const serverDir = `${outDir}/${server}`;
    if (!fs.existsSync(serverDir)) {
        fs.mkdirSync(serverDir);
    }
    fs.writeFileSync(`${serverDir}/${filename}.${ext}`, buffer)
}

function makeId() {
    const length = 6;
    let result           = '';
    let characters       = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function makeServer() {
    if (FORCE_SERVER) {
        return parseInt(FORCE_SERVER);
    }
    return 1 + Math.round(Math.random() * 8);
}

function getStartingImage() {
    return {
        id: makeId(),
        server: makeServer()
    }
}

async function main() {
    let current = {
        id: initialId || makeId(),
        server: initialServer || makeServer()
    };
    while (true) {
        try {
            console.log("grab start", current.id, current.server);
            const res = await grab(current.id, current.server);
            // duplicate
            if (res === null) {
                current = getStartingImage();
                console.log("Duplicate, starting with new random image");
                continue;
            }
            console.log("grab finish", res.ok);
            current = res.next;
        } catch (err) {
            console.log("grab error", err.message);
            current = getStartingImage();
        }
    }
}

main();