const CACHE_NAME = "voltann-mobile-v1";


const FILES_TO_CACHE = [

    "voltann_dashboard.html",

    "voltann_core.json",

    "manifest.json"

];



self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches.open(CACHE_NAME)

            .then(cache => {

                return cache.addAll(
                    FILES_TO_CACHE
                );

            })

        );

    }

);





self.addEventListener(
    "activate",
    event => {


        event.waitUntil(

            caches.keys()

            .then(keys => {

                return Promise.all(

                    keys.map(key => {


                        if(
                            key !== CACHE_NAME
                        ){

                            return caches.delete(
                                key
                            );

                        }


                    })

                );


            })

        );


    }

);






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


    }

);





// Future synchronization layer

self.addEventListener(
    "sync",
    event => {


        if(
            event.tag ===
            "voltann-sync"
        ){


            event.waitUntil(

                synchronizeVoltann()

            );


        }


    }

);





async function synchronizeVoltann(){


    console.log(

        "Voltann synchronization check"

    );


    // Future:

    // Upload approved changes

    // Download updates

    // Sync missions

}
