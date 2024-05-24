const User = require('../models/user')
const asyncHandler = require('express-async-handler')
const { generateAccessToken, generateRefreshToken } = require('../middlewares/jwt')
const jwt = require('jsonwebtoken')
const sendMail = require('../ultils/sendMail')
const crypto = require('crypto')
const makeToken = require('uniqid')
const {users} = require('../ultils/constant')

const register = asyncHandler(async (req, res) => {
    const { email, password, firstname, lastname } = req.body
    if (!email || !password || !lastname || !firstname)
        return res.status(400).json({
            success: false,
            mes: 'Missing inputs'
        })

    const user = await User.findOne({ email })
    if (user)
        throw new Error('User has existed!')
    else {
        const newUser = await User.create(req.body)
        return res.status(200).json({
            success: newUser ? true : false,
            mes: newUser ? 'Register is successfully. Please go login~' : 'Something went wrong'
        })
    }
});

// const register = asyncHandler(async(req, res) =>{
//     const { email, password, firstname, lastname, mobile} = req.body
//     if (!email || !password || !lastname || !firstname || !mobile)
//         return res.status(400).json({
//             success: false,
//             mes: 'Missing inputs'
//         })
//         const user = await User.findOne({ email })
//             if (user)
//                 throw new Error('User has existed!')
//             else {
//                 const token = makeToken()
//                 const emailedited = btoa(email)+ '@' + token
//                 const newUser = await User.create({
//                     email: btoa(email)+ '@'+ token, password, firstname, lastname, mobile
//                 })
//                 if (newUser) {
//                     const html = `<h2>Mã đăng kí:</h2><br /><blockquote>${token}</blockquote>`
//                     await sendMail({email, html, subject: 'Xác nhận đăng kí tài khoản ở Fashion Store'})
//                 }
//                 setTimeout( async() => {
//                     await User.deleteOne({email})
//                 }, [20000])
//                 return res.json({
//                     success: newUser ? true : false,
//                     mes: newUser ? 'Vui lòng check email của bạn!' : 'Lỗi! Vui lòng thử lại sau.'
//                 })
//             }
// })

const finalRegister = asyncHandler(async (req, res) => {
    //const cookie = req.cookies
    const { token} = req.params 
    const notActiveEmail = await User.findOne({email: new RegExp(`${token}$`)})
    if (notActiveEmail) {
        notActiveEmail.email = atob(notActiveEmail?.email?.split('@')[0])
        notActiveEmail.save()
    }
    
    return res.json({
        success: notActiveEmail ? true : false,
        mes: notActiveEmail ? 'Đăng kí thành công. Mời bạn đăng nhập.'  : 'Lỗi! Vui lòng thử lại sau.'
    })
})

// Refresh token => cấp mới access token 
// access token => xác thực người dùng , phân quyền người dùng
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (!email || !password)
        return res.status(400).json({
            success: false,
            mes: 'Missing inputs'
        })

    const response = await User.findOne({ email })

    if (response && await response.isCorrectPassword(password)) {
        // Tách password vào role ra khỏi response
        const { password, role, refreshToken, ...userData } = response.toObject()
        //tạo access token
        const accessToken = generateAccessToken(response._id, role)
        //tạo refresh token
        const newRefreshToken = generateRefreshToken(response._id)
        // Luwu refresh token vao database
        await User.findByIdAndUpdate(response._id, { refreshToken: newRefreshToken }, { new: true })
        // lưu refresh token vafo cookie
        res.cookie('refreshToken', newRefreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
        return res.status(200).json({
            success: true,
            accessToken,
            userData
        })
    } else {
        throw new Error('invalid credentials!')
    }
});


const getCurrent = asyncHandler(async (req, res) => {
    const { _id } = req.user
    const user = await User.findById(_id).select('-refreshToken -password').populate({
        path: 'cart',
        populate: {
            path: 'product',
            select: 'title thumb price'
        }
    })
    return res.status(200).json({
        success: user ? true : false,
        rs: user ? user : 'User node found'
    })
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    // Lấy token từ cookies 
    const cookie = req.cookies
    // check xem có token hay không 
    if (!cookie && !cookie.refreshToken) throw new Error('No refresh token in cookies')
    // check token có hợp lệ hay không
    const rs = await jwt.verify(cookie.refreshToken, process.env.JWT_SECRET)
    const response = await User.findOne({ _id: rs._id, refreshToken: cookie.refreshToken })
    return res.status(200).json({
        success: response ? true : false,
        newAccessToken: response ? generateAccessToken(response._id, response.role) : 'Refresh token not matched'
    })

    // jwt.verify(cookie.refreshToken, process.env.JWT_SECRET, async (err, decode) => {
    //     if (err) throw new Error('Invalid refresh token')
    //     // check xem token này có khớp với token đã lưu trong db hay k
    //     const response = await User.findOne({ _id: decode._id, refreshToken: cookie.refreshToken })
    //     return res.status(200).json({
    //         success: response ? true : false,
    //         newAccessToken: response ? generateAccessToken(response._id, response.role) : 'Refresh token not matched'
    //     })
    // })
})

const logout = asyncHandler(async (req, res) => {
    const cookie = req.cookies
    if (!cookie || !cookie.refreshToken) throw new Error('No refresh token in cookies')
    // Xoá refresh token ở db
    await User.findOneAndUpdate({ refreshToken: cookie.refreshToken }, { refreshToken: '' }, { new: true })
    // Xoá refresh token ở cookie trình duyệt
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true
    })
    return res.status(200).json({
        success: true,
        mes: 'Logout is done'
    })
})


// Client gửi cho email 
// Server check email có hợp lệ hay không => Gửi mail  + kèm theo link (password change token)
// Client check email => click link 
// client gửi api kèm theo token
// check token có giống với token mà server gửi mail hay không
// Change password

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body
    if (!email) throw new Error('Missing email')
    const user = await User.findOne({ email })
    if (!user) throw new Error('User not found')
    const resetToken = user.createPasswordChangedToken()
    await user.save()

    const html = `Xin vui lòng click vào link dưới đây để thay đổi mật khẩu của bạn.Link này sẽ hết hạn sau 15 phút kể từ bây giờ 
    <a href=${process.env.CLIENT_URL}/reset-password/${resetToken}>Click here</a>`

    const data = {
        email,
        html,
        subject: 'Forgot password'
    }
    const rs = await sendMail(data)
    return res.status(200).json({
        success: rs.response?.includes('OK') ? true : false,
        mes: rs.response?.includes('OK') ? 'Hãy check mail của bạn.' : 'Đã có lỗi, hãy thử lại sau.'
    })
})

const resetPassword = asyncHandler(async (req, res) => {
    const { password, token } = req.body
    if (!password || !token) throw new Error('Missing inputs')
    const passwordResetToken = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({ passwordResetToken, passwordResetExpires: { $gt: Date.now() } })
    if (!user) throw new Error('Invalid reset token')
    user.password = password
    user.passwordResetToken = undefined
    user.passwordChangeAt = Date.now()
    user.passwordResetExpires = undefined
    await user.save()
    return res.status(200).json({
        success: user ? true : false,
        mes: user ? "Update password" : "Something went wrong"
    })
})

const getUsers = asyncHandler(async (req, res) => {
    const queries = { ...req.query }
    // Tách các trường đặt biệt ra khỏi query
    const excludeFields = ['limit', 'sort', 'page', 'fields']
    excludeFields.forEach(el => delete queries[el])

    // Format lại các operators cho đúng cú pháp của mongoose
    let queryString = JSON.stringify(queries)
    queryString = queryString.replace(/\b(gte|gt|lt|lte)\b/g, macthedEl => `$${macthedEl}`)
    const formatedQueries = JSON.parse(queryString)

    if (queries?.name) formatedQueries.name = { $regex: queries.title, $options: 'i' } // "i" không phân biệt hoa thường
    
    
    if (req.query.q) {
        delete formatedQueries.q
        formatedQueries['$or'] = [
            { firstname : { $regex: req.query.q, $options: 'i' }},
            { lastname : { $regex: req.query.q, $options: 'i' }},
            { email : { $regex: req.query.q, $options: 'i' }},

        ]
    }
    


    let queryCommand = User.find(formatedQueries)

    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ')
        queryCommand = queryCommand.sort(sortBy)

    }

    if (req.query.fields) {
        const fields = req.query.fields.split(',').join(' ')
        queryCommand = queryCommand.select(fields)
    }
    
    

   
    const page = +req.query.page || 1
    const limit = +req.query.limit || process.env.LIMIT_PRODUCTS
    const skip = (page - 1) * limit
    queryCommand.skip(skip).limit(limit)
    
    queryCommand.exec(async (err, response) => {
        if (err) throw new Error(err.message)
        const counts = await User.find(formatedQueries).countDocuments()
        return res.status(200).json({
            success: response ? true : false,
            counts,
            users: response ? response : 'Cannot get users'

        })
    })
})

const deleteUser = asyncHandler(async (req, res) => {
    const { uid } = req.params
    const response = await User.findByIdAndDelete(uid)
    return res.status(200).json({
        success: response ? true : false,
        mes: response ? `User with email ${response.email} deleted` : 'No user delete'
    })
})

const updateUser = asyncHandler(async (req, res) => {
    // 
    const { _id } = req.user
    const {firstname, lastname, email, mobile, address} = req.body
    const data = {firstname, lastname, email, mobile, address}
    if (!_id || Object.keys(req.body).length === 0) throw new Error('Missing inputs')
    const response = await User.findByIdAndUpdate(_id, data , { new: true }).select('-password -role -refreshToken')
    return res.status(200).json({
        success: response ? true : false,
        mes: response ? 'Updated' : 'Some thing went wrong'
    })
})

const updateUserByAmin = asyncHandler(async (req, res) => {
    // 
    const { uid } = req.params
    if (Object.keys(req.body).length === 0) throw new Error('Missing inputs')
    const response = await User.findByIdAndUpdate(uid, req.body, { new: true }).select('-password -role')
    return res.status(200).json({
        success: response ? true : false,
        mes: response ? 'Updated' : 'Some thing went wrong'
    })
})


const updateUserAddress = asyncHandler(async (req, res) => {
    // 
    const { _id } = req.user
    if (!req.body.address) throw new Error('Missing inputs')
    const response = await User.findByIdAndUpdate(_id, { $push: { address: req.body.address } }, { new: true }).select('-password -role')
    return res.status(200).json({
        success: response ? true : false,
        updateUser: response ? response : 'Some thing went wrong'
    })
})


const updateCart = asyncHandler(async (req, res) => {
    const { _id } = req.user
    const { pid, title, quantity = 1, size, price } = req.body
    if (!pid || !size) throw new Error('Missing inputs')
    const user = await User.findById(_id).select('cart')
   
    const alreadyProduct = user?.cart?.find(el => el.product.toString() === pid)
    if (alreadyProduct) {     
            const response = await User.updateOne({ 
                cart: { $elemMatch: alreadyProduct } }, 
                { 
                    $set: { 
                    "cart.$.quantity": quantity, 
                    "cart.$.price": price,
                    "cart.$.title": title,
                } 
            }, { new: true })
            return res.status(200).json({
                success: response ? true : false,
                mes: response ? 'Updated your cart' : 'Some thing went wrong'
            })
   
    } else {
        const response = await User.findByIdAndUpdate(_id, { $push: { cart: { product: pid, title,  quantity, size, price } } }, { new: true })
        return res.status(200).json({
            success: response ? true : false,
            mes: response ? 'Updated your cart' : 'Some thing went wrong'
        })
    }
})
const removeProductIncart = asyncHandler(async (req, res) => {
    const { _id } = req.user
    const { pid } = req.params
    
    const user = await User.findById(_id).select('cart')
    const alreadyProduct = user?.cart?.find(el => el.product.toString() === pid)
    if (!alreadyProduct) return res.status(200).json({
        success:  true,
        mes: 'Update your cart'
    })
    const response = await User.findByIdAndUpdate(_id, { $pull: { cart: { product: pid } } }, { new: true })
        return res.status(200).json({
            success: response ? true : false,
            mes: response ? 'Updated your cart' : 'Some thing went wrong'
        })
})
const createUsers = asyncHandler(async(req,res) => {
    const response = await User.create(users)
    return res.status(200).json({
        success: response ? true : false,
        users: response ? response : 'Some thing went wrong' 
    })
})

module.exports = {
    register,
    finalRegister,
    login,
    getCurrent,
    refreshAccessToken,
    logout,
    forgotPassword,
    resetPassword,
    getUsers,
    deleteUser,
    updateUser,
    updateUserByAmin,
    updateUserAddress,
    updateCart,
    createUsers,
    removeProductIncart
}

