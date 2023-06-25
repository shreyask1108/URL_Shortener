const express = require('express')
const app = express()
const {MongoClient,ObjectId}=require("mongodb");
const mongoose = require('mongoose')
const ShortURL = require('./models/url')
const BodyParser = require("body-parser")
const Cors = require("cors")
const path =require("path")
require("dotenv").config();
const client= new MongoClient(process.env.DB);

app.set('view engine', 'ejs')

app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }))
app.use(Cors());
app.use(express.static(path.join(__dirname,'public')))



var collection;

app.get('/', async(req, res) => {
	res.render('home')
})

app.get("/search",async(request,response)=>{
	try{
		let result =await collection.aggregate([
			{
				// "$search":{
				// 	"autocomplete":
				// 		{
				// 		"query":`${request.query.term}`,
				// 		"path":"short",
				// 		"fuzzy":{
				// 			"maxEdits":2
				// 			}	
				// 		},
						
				// }
				"$search": {
					"compound": {
						"should": [
							{
								"autocomplete": {
									"query":`${request.query.term}`,
									"path":"full",
									"fuzzy":{
										"maxEdits":2,
										"prefixLength": 3,
									},
									"tokenOrder":"sequential",
								},
							},
							{
								"autocomplete": {
									"query":`${request.query.term}`,
									"path":"short",
									"fuzzy":{
										"maxEdits":2,
										"prefixLength": 3,
										},
									"tokenOrder":"sequential",
								},
							},
							{
								"autocomplete": {
									"query":`${request.query.term}`,
									"path":"note",
									"fuzzy":{
										"maxEdits":2,
										"prefixLength": 3,
										},
									"tokenOrder":"sequential",
								},
							},
						],
					},
				},
			}
		]).toArray()
		response.send(result);
	}catch(e){
		response.status(500).send({message:e.message})
	}
})


app.get('/shrink', async(req, res) => {
	const allData = await ShortURL.find()
	res.render('shorten',{ shortUrls: allData })
})

app.get('/urlsearch', async(req, res) => {
	res.render('search')
})


app.get("/get/:id",async(request,response)=>{
	try{ 
		let result = await collection.findOne({ "_id": new ObjectId(request.params.id) });
        response.send(result);
	}catch(e){
		response.status(500).send({message:e.message});
	}
})

app.get('/:shortid', async (req, res) => {
	const shortid = req.params.shortid
	const rec = await ShortURL.findOne({ short: shortid })
	if (!rec) return res.sendStatus(404)
	rec.clicks++
	await rec.save()
	res.redirect(rec.full)
})

app.post('/short', async (req, res) => {
	const noteUrl = req.body.noteUrl
	const fullUrl = req.body.fullUrl
	let result ;
	result = await collection.findOne({
		"full": fullUrl,
	});
	console.log('URL requested:- ', fullUrl)
	
	if(!result){
		const record = new ShortURL({
			full: fullUrl,
			note: noteUrl
		})
		await record.save()
		res.redirect('/shrink')
	}

	else{
		res.render('exists')
	}
	
	
	
})


// Setup your mongodb connection here
mongoose.connect(process.env.DB, {
	useNewUrlParser: true
})
mongoose.connection.on('open', () => {
	app.listen(3000, async() => {
		try{
			console.log('Server Started')
			await client.connect();
			collection=client.db("test").collection("shorturls");
		}catch(e){
			console.log(e);
		}
	})
})