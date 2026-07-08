const CACHE_NAME = "voltann-mobile-v1.1";


const APP_FILES = [

    "./",

    "./index.html",

    "./voltann_core.json",

    "./voltann_memory.js",

    "./manifest.json"

];



// Install Voltann offline core

self.addEventListener(
"install",
event => {


event.waitUntil(

caches.open(CACHE_NAME)

.then(cache => {


return cache.addAll(
APP_FILES
);


})

);


self.skipWaiting();


});




// Activate new versions

self.addEventListener(
"activate",
event => {


event.waitUntil(

caches.keys()

.then(keys => {


return Promise.all(

keys.map(key => {


if(key !== CACHE_NAME){


return caches.delete(key);


}


})

);


})

);


self.clients.claim();


});




// Load cached files first

self.addEventListener(
"fetch",
event => {


event.respondWith(


caches.match(
event.request
)

.then(response => {


if(response){

return response;

}


return fetch(
event.request
);


})


);


});




// Future Voltann synchronization

self.addEventListener(
"sync",
event => {


if(
event.tag === "voltann-sync"
){


event.waitUntil(

voltannSync()

);


}


});





async function voltannSync(){


console.log(

"◇ Voltann synchronization check ◇"

);


// Future systems:

// - Cloud memory sync

// - Mission updates

// - Repository updates

// - Creator approvals


}
