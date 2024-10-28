const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const multer = require('../middlewares/multer-config');

const bookCtrl = require('../controllers/book');




router.get('/', bookCtrl.getAllBooks);
router.get('/bestrating', bookCtrl.getBestRatingBook);
router.get('/:id', bookCtrl.getOneBook);
router.post('/', auth, multer, bookCtrl.createBook);

router.delete('/:id', auth, bookCtrl.deleteBook);
router.put('/:id', auth, multer, bookCtrl.updateBook);
router.post('/:id/rating', auth, bookCtrl.rateBook);



module.exports = router;
