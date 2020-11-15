const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true } )

const exerciseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String
})

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  log: [exerciseSchema]
})

const Exercise = mongoose.model('exercise', exerciseSchema)
const User = mongoose.model('user', userSchema)

app.use(cors())

//app.use(bodyParser.urlencoded({ extended: false }))
//app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Not found middleware
/*
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})
*/

//routes
app.post('/api/exercise/new-user', bodyParser.urlencoded({ extended: false }), (req, res) => {
  const { username } = req.body

  const user = new User({
    username
  })

  user.save((err, saved) => {
    if(!err) res.json(saved)
  })
})

app.post('/api/exercise/add', bodyParser.urlencoded({ extended: false }), (req, res) => {
  const { userId, description, duration } = req.body
  const date = req.body['date'] || new Date().toISOString()

  const exercise = new Exercise({
    description,
    date,
    duration: parseInt(duration)
  })

  User.findByIdAndUpdate(userId, { $push: { log: exercise } }, { 'new': false }, (err, updated) => {
    const { _id, username } = updated
    if(!err) res.json({
        _id,
        username,
        date: new Date(exercise.date).toDateString(),
        duration: parseInt(duration),
        description
      })
  })

})

app.get('/api/exercise/users', (req, res) => {
  User.find({}, (err, allUsers) => {
    if(!err) res.json(allUsers)
  })
})

app.get('/api/exercise/log', (req, res) => {
  const { userId } = req.query
  
  User.findById(userId, (err, result) => {
    const { log } = result
    if(!err) {
      const resObj = {
        log
      }

      if(req.query.from || req.query.to) {
        let fromDate = new Date(0)
        let toDate = new Date()
        
        if(req.query.from) fromDate = new Date(req.query.from)

        if(req.query.to) toDate = new Date(req.query.to)

        fromDate = fromDate.getTime()
        toDate = toDate.getTime()

        resObj.log = log.filter( exercise => {
          let exerciseDate = new Date(exercise.date).getTime()
          console.log(exerciseDate >= fromDate && exerciseDate <= toDate)
          return exerciseDate >= fromDate && exerciseDate <= toDate
        })
      }

      if(req.query.limit) {
        resObj.log = resObj.log.slice(0, req.query.limit)
      }
      resObj.count = log.length
      res.json(resObj)
    }  
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
