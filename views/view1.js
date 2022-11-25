module.exports = function(app){

    app.get('/', function(req, res){
        // res.render('login', {
        //     title: 'Express Login'
        // });
        res.sendFile('v1.html', {root: __dirname })
    });

    //other routes..
}

