const express = require("express")
const ejs = require("ejs")
const bodyParser = require("body-parser")
const mysql = require("mysql")
const fileUpload = require("express-fileupload")
const path = require("path")
const dotenv = require("dotenv")

const jwt = require("jsonwebtoken");
// const bcrypt = require("bcryptjs")
const cookieParser = require("cookie-parser")

dotenv.config({ path: "./.env" })

const app = express()

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Password@123',
    database: 'interndb',
})

db.connect((err) => {
    if (err) {
        console.log(err)
    }
    else {
        console.log("Connected")
    }
})


app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.use(cookieParser())

app.get("/", function (req, res) {
    res.render("index");
})

app.get("/register", function (req, res) {
    res.render("register");
})

app.get("/login", function (req, res) {
    res.render("login");
})



app.post("/save", function (req, res) {
    var name = req.body.username;
    var email = req.body.email;
    var password = req.body.password;
    var phone = req.body.phone;
    var gender = req.body.gender;

    var today = new Date();
    console.log(today)

    var sql = "INSERT INTO user SET ?";
    var data = { user_name: name, user_email: email, user_password: password, phone: phone, gender: gender, created_at: today }

    db.query(sql, data, function (err, result) {
        if (err) {
            console.log(err)
        }
        console.log(result);
        res.redirect("login")
    })


})

global.mail = "";

app.post("/log", function (req, res) {
    var name = req.body.email;
    var password = req.body.password;
    try {
        db.query("SELECT * FROM user where user_email = ?", [name], async (error, results) => {
            console.log(results);
            console.log(password)
            console.log(results[0].user_password)
            mail = results[0].user_email;
            if (!results || (password != results[0].user_password)) {
                console.log("woring")
                res.status(400).send("sORRY")
            } else {
                const id = results[0].user_id;

                const token = jwt.sign({ user_id: id }, process.env.JWT_SECRET, {
                    expiresIn: process.env.JWT_EXPIRES_IN
                })

                console.log("Token: " + token);

                const cookieOptions = {
                    expires: new Date(
                        Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000,
                    ),
                    httpOnly: true
                }

                res.cookie('jwt', token, cookieOptions);
                console.log("looged")
                my_name = results[0].user_name;
                res.render("user", { users: results[0] })
            }
        })
    } catch (err) {
        console.log(err);
    }
})

//using the cookies
app.get("/user", async function (req, res, next) {
    console.log(req.cookies)
    if (req.cookies.jwt) {
        try {
            const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET)
            console.log(decoded)

            //user exists or not
            db.query('SELECT * FROM user WHERE user_id = ?', [decoded.id], (error, result) => {
                console.log(result)

                if (!result) {
                    return next();
                }

                req.user = result[0];
                return next();
            });

        } catch (error) {
            console.log(error)
            return next();
        }
    } else {
        next();
    }

})

//accessing the page with the help of cookie
app.get("/user", (req, res) => {
    if (req.user) {
        res.render('user');
    } else {
        // res.redirect("/register")
    }
})


//logout function
app.get("/logout", (req, res) => {
    res.cookie('jwt', 'logout', {
        expires: new Date(Date.now() + 5 * 1000),
        httpOnly: true
    });

    var today = new Date();
    console.log(today)

    db.query(`UPDATE user SET last_logged = '${today}' WHERE user_email = ?`, [mail], function (err, result) {
        if (err) {
            console.log(err)
        }
        res.status(200).redirect("/")
    })

})




app.get("/edit_profiles/:id", function (req, res) {
    const id = req.params.id;
    db.query("SELECT * FROM user WHERE user_id =? ", [id], function (err, result) {
        if (err) {
            console.log(err);
        }
        console.log(result);
        res.render("user-edit", { user: result[0] })
    })
})


app.post("/user_profile_edit", function (req, res) {

    // const id = req.body.id;
    // console.log(id);

    if (!req.files) {
        return res.status(400).send('No files were uploaded.');
    }


    var file = req.files.uploaded_image;
    var img_name = file.name;

    if (file.mimetype == "image/jpeg" || file.mimetype == "image/png" || file.mimetype == "image/gif") {
        file.mv('public/upload_images/' + file.name, function (err) {
            if (err) {
                return res.status(500).send(err);
            }
            db.query("SELECT * FROM user WHERE user_email = ?", [mail], function (err, result) {
                if (err) {
                    console.log(err);
                }
                db.query(`UPDATE user SET phone = '${req.body.pmobile}',gender = '${req.body.pgender}',user_image = '${img_name}' WHERE user_email =? `, [mail], function (errr, results) {
                    if (errr) {
                        console.log(errr);
                    }
                    // console.log(results[0])
                    res.redirect("/profile");
                })
            })
        })
    }


})



//profile
app.get("/profile", function (req, res) {
    db.query("SELECT * FROM user WHERE user_email = ?", [mail], function (err, results) {
        if (err) {
            console.log(err);
        }
        else {
            res.render("profile", { users: results[0] });
        }
    })
})

app.get("/delete_profiles/:id", function (req, res) {
    const id = req.params.id;
    db.query("DELETE FROM user WHERE user_id = ?", [id], function (err, results) {
        if (err) {
            console.log(err)
        }
        res.redirect("/");
    })
})


app.get("/details", function (req, res) {

    try {
        db.query("SELECT * FROM user", function (err, results) {
            if (err) {
                console.log(err);
            }
            res.render("alluser", { users: results })
        })
    } catch (error) {
        console.log(error);
    }
})

app.listen(3000, function () {
    console.log("Successfuly started port on 3000")
})