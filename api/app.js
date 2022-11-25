console.log('api folder imdex sayms Hemloooo!');
const http = require('http');
const path = require("path");
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');

const app = express();

const fs = require('fs');
const { parse }= require('csv-parse');


const MIME_TYPE_MAP = {
    'application/json' : 'json',
    'text/csv' : 'csv'
}

const storage = multer.diskStorage({
    destination: (req, file, cb)=>{
        const isValid = MIME_TYPE_MAP[file.mimetype];
        let error = new Error("Invalid Mime type");
        if (isValid){
            error = null;
        }

        if (isValid == 'json'){
            cb(error, "./backend/inputJson");
        }
        if (isValid == 'csv'){
            cb(error, "./backend/mapping");
        }
    },
    filename: (req, file, cb) =>{
        const name = file.originalname+'_converted'+Date.now();
        const ext = MIME_TYPE_MAP[file.mimetype];
        cb(null, name+'.'+ext);
    }
});

app.use(bodyParser.urlencoded({extended : false}));
app.use(bodyParser.json());
app.use("/backend",express.static(path.join("backend")));

app.post('/api/test',multer({storage: storage}).fields([{name: 'source', maxCount: 1},{name: 'mapping', maxCount: 1}]), (req,res,next)=>{
    const url = req.protocol + '://' + req.get("host");;
    const sourceUrl = url + '/backend/inputJson/' + req.files['source'][0].filename;
    const mappingUrl = url + '/backend/mapping/' + req.files['mapping'][0].filename;
    
    let records = [];
    const readPath = path.join(__dirname, '../', 'backend/mapping/'+req.files['mapping'][0].filename);
    // console.log(readPath);

    const parser = parse({columns: true, relax_quotes:true, relax_column_count: true}, function (err, records) {
        if (err){
            console.log('err : ',err);
            res.status(201).json({
                message: 'records could not be read',
                output : err
            });
        }
        this.records = records;
        
        let jsonReq = http.get(sourceUrl, function(response) {
            let data = '',
                json_data;

            response.on('data', function(stream) {
                data += stream;
            });
            response.on('end', function() {
                json_data = JSON.parse(data);

                let outputMap = new Map();

                // Code to iterate through the array
                let lenRecord = records.length;
                for (let i = 0;i < lenRecord; i++){

                    var key = records[i]['Target'].trim();

                    var arr1 = records[i][' Source'].split(" + ");


                    let outStr = '';
                    for (let j = 0; j < arr1.length; j++){
                        arr1[j] = arr1[j].trim();
                        console.log(arr1[j]);
                        var outInner = '';
                        if(arr1[j].substring(0,5)=='ENUM('){
                            console.log('ENUM Found');
                            let enumeration = records[i][' Enumeration'];
                            let toCheck = arr1[j].substring(6,arr1[j].length-1);
                            let enumArr = enumeration.split(';');
                            // console.log(enumArr,' ::::: dfgh', 'to check with :::', toCheck);
                            let compareWith = json_data[toCheck];
                            enumArr.forEach(element => {
                                kv = element.split(":");
                                let sliced = kv[0].slice(1,kv[0].length-1);
                                console.log(sliced,compareWith);
                                if(sliced===compareWith){
                                    // console.log('in the if block');
                                    outInner = kv[1];
                                }
                                // else{
                                //     console.log('in the else block');
                                // }
                            });
                        }
                        // else if(arr1[j].includes('IF(')){
                        //     // console.log('has IF');
                        //     outInner = ' IF ';
                        // }
                        else
                        {
                            var arr2 = arr1[j].split('.');
                            var arr2len = arr2.length;
                            console.log(arr2);
                            if(typeof(json_data[arr2[1]]) === 'undefined'){
                                var temparr = arr2[0].slice(1,arr2[0].length-1);
                            }
                            else{
                                var temparr = json_data[arr2[1]];
                            }
                            for(let k=2; k < arr2len; k++){
                                arr2[k] = arr2[k];
                                temparr = temparr[arr2[k]]
                                if(typeof(temparr)=="string"){
                                    break;
                                }
                            }
                            outInner+=temparr
                        }
                        outStr+=outInner + ' ';
                    }
                    outputMap.set(key, outStr);
                }
                // Code to iterate through the array - Complete

                // covert the map to json
                const jsonOut = Object.fromEntries(outputMap);

                res.status(201).json({
                    jsonOut
                });
            });
        });

        jsonReq.on('error', function(e) {
            console.log(e.message);
        });
    });
    fs.createReadStream(readPath).pipe(parser);

})

module.exports = app;