const router = require('express').Router()

const ctrls = require('../controllers/productCategory')
const { verifyAccessToken, isAdmin } = require('../middlewares/verifyToken')

router.post('/', [verifyAccessToken, isAdmin], ctrls.createCategory)
router.get('/', ctrls.getCategories)
router.put('/:pcid', [verifyAccessToken, isAdmin], ctrls.updateCategory)
router.delete('/:pcid', [verifyAccessToken, isAdmin], ctrls.deleteCategory)

module.exports = router

// CRUD | Create - Read - Update - Delete | Post - Get - Put - Delete
// Create (Post) + PUT - body
// GET + DELETE - query 