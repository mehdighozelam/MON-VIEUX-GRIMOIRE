const bcrypt = require("bcrypt");

const User = require("../models/user");
console.log("test");

exports.signup = (req, res, next) => {
console.log(req.body);
  bcrypt
    .hash(req.body.password, 10)
    .then((hash) => {
      const user = new User({
        email: req.body.email,
        password: hash,
      });
      user
        .save()
        .then(() => {
          console.log("utilisateur ok");
          res.status(201).json({ message: "Utilisateur créé !" });
        })

        // .then(() => res.status(201).json({ message: "Utilisateur créé !" }))
        .catch((error) => res.status(400).json({ error }));
        // console.log("utilisateur ok");
    })
    .catch((error) => res.status(500).json({ error }));
};



const jwt = require('jsonwebtoken');

exports.login = (req, res, next) => {
  User.findOne({ email: req.body.email })
    .then((user) => {
      if (!user) {
        return res
          .status(401)
          .json({ message: "Paire login/mot de passe incorrecte" });
      }
      bcrypt
        .compare(req.body.password, user.password)
        .then((valid) => {
          if (!valid) {
            return res
              .status(401)
              .json({ message: "Paire login/mot de passe incorrecte" });
          }
          // Générer le jeton JWT
          const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET
          );
          res.status(200).json({
            userId: user._id,
            token: token, // Envoyer le jeton JWT dans la réponse
          });
        })
        .catch((error) => res.status(500).json({ error }));
    })
    .catch((error) => res.status(500).json({ error }));
};



