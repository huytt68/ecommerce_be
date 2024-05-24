const router = require('express').Router()
const ctrls = require('../controllers/user')
const { verifyAccessToken, isAdmin } = require('../middlewares/verifyToken')

router.post('/register', ctrls.register)
router.post('/mock', ctrls.createUsers)
router.put('/finalregister/:token', ctrls.finalRegister)
router.post('/login', ctrls.login)
router.get('/current', verifyAccessToken, ctrls.getCurrent)
router.post('/refreshToken', ctrls.refreshAccessToken)
router.get('/logout', ctrls.logout)
router.post('/forgotpassword', ctrls.forgotPassword)
router.put('/resetpassword', ctrls.resetPassword)
router.get('/', [verifyAccessToken, isAdmin], ctrls.getUsers)
router.delete('/:uid', [verifyAccessToken, isAdmin], ctrls.deleteUser)
router.put('/current', [verifyAccessToken], ctrls.updateUser)
router.put('/address', [verifyAccessToken], ctrls.updateUserAddress)
router.put('/cart', [verifyAccessToken], ctrls.updateCart)
router.delete('/remove-cart/:pid', [verifyAccessToken], ctrls.removeProductIncart)
router.put('/:uid', [verifyAccessToken, isAdmin], ctrls.updateUserByAmin)


module.exports = router

// CRUD | Create - Read - Update - Delete | Post - Get - Put - Delete
// Create (Post) + PUT - body
// GET + DELETE - query 