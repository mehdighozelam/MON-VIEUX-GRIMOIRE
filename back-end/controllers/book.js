const Book = require("../models/Book");
// Module fs de node.js pour intéragir avec le système de fichiers
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Configuration de multer pour gérer le téléchargement de fichiers // Mise à jour du fichier
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'images'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });



exports.createBook = async (req, res, next) => {
    try {
        // Récupérer l'ID de l'utilisateur à partir du middleware d'authentification
        const userId = req.auth.userId;

        // Récupérer les données du corps de la requête
        const bookObj = JSON.parse(req.body.book);

        const { title, author, year, genre, ratings } = bookObj;
        let filename = "";

        // Vérification si un fichier d'image est téléchargé
        if (req.file) {
            filename = req.file.filename; // Chemin du fichier d'image téléchargé
        }
        let averageRating = 0;
        if (ratings.length === 1) {
            averageRating = ratings[0].grade;

        }
        console.log(averageRating, ratings);

        // Création d'un nouveau livre
        const newBook = new Book({
            userId: userId,
            title: title,
            author: author,
            imageUrl: `${req.protocol}://${req.get('host')}/images/${filename}`,
            year: year,
            genre: genre,
            ratings: ratings,
            // Initialiser la note à 0
            averageRating: averageRating
        });

        // Enregistrer le nouveau livre dans la base de données
        const savedBook = await newBook.save();

        res.status(201).json(savedBook); // Renvoie le nouveau livre créé
    } catch (error) {
        console.error(error);
        // Supprimer le fichier d'image téléchargé en cas d'erreur lors de l'enregistrement du livre
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: 'Erreur lors de la création du livre.' });
    }
};


// Afficher tous les livres présents dans la base de données
exports.getAllBooks = (req, res, next) => {
    Book.find() // Trouve tous les livres
        .then(books => {
            // console.log("Livres dans la base de données :");
            // console.log(books); // Affiche les livres dans la console
            res.status(200).json(books); // Renvoie les livres
        })
        .catch(error => res.status(400).json({ error })); // Gère les erreurs
};


// Accéder au détail d'un livre
exports.getOneBook = (req, res, next) => {
    Book.findOne({ _id: req.params.id }) // Trouve le livre avec l'_id fourni
        .then(book => res.status(200).json(book)) // Renvoie le livre
        .catch(error => res.status(404).json({ error })); // Gère les erreurs
};

// Supprimer un livre - et supprimer les images dans le dossier "images". Faire un findOne avant, on récupère l'image URL et utiliser fs.unlink - utiliser autre méthode que findByIdAndDelete pour traitement de l'image
exports.deleteBook = (req, res, next) => {
    // Trouver le livre par son ID
    Book.findOne({ _id: req.params.id })
        .then(foundBook => {
            console.log("Livre trouvé :", foundBook);

            if (!foundBook) {
                console.log("Livre non trouvé.");
                return res.status(404).json({ message: "Livre non trouvé." });
            }

            // Vérifier si le livre a une image associée
            if (!foundBook.imageUrl) {
                console.log("Le livre n'a pas d'image associée.");
                return res.status(404).json({ message: "Le livre n'a pas d'image associée." });
            }

            // Extraire le nom de fichier à partir de l'URL
            const fileName = foundBook.imageUrl.split('/').pop();
            // Construire le chemin de l'image
            const imagePath = path.join(__dirname, '..', 'images', fileName);
            console.log("Chemin de l'image :", imagePath);

            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error("Erreur lors de la suppression de l'image :", err);
                    return res.status(500).json({ error: "Erreur lors de la suppression de l'image." });
                }

                console.log("L'image a été supprimée avec succès.");


                // Supprimer le livre de la base de données
                Book.deleteOne({ _id: foundBook._id })
                    .then(() => {
                        console.log("Livre supprimé avec succès de la base de données.");
                        res.status(200).json({ message: "Livre supprimé avec succès." });
                    })
                    .catch(error => {
                        console.error("Erreur lors de la suppression du livre de la base de données :", error);
                        res.status(500).json({ error: "Erreur lors de la suppression du livre." });
                    });
            });
        })
        .catch(error => {
            console.error("Erreur lors de la recherche du livre :", error);
            res.status(500).json({ error: "Erreur lors de la recherche du livre." });
        });
};



exports.updateBook = (req, res, next) => {
    const bookId = req.params.id;
    const updatedBookData = req.body; // Les données mises à jour du livre

    // Trouver le livre par son ID
    Book.findById(bookId)
        .then(foundBook => {
            console.log("Livre trouvé :", foundBook);

            if (!foundBook) {
                console.log("Livre non trouvé.");
                return res.status(404).json({ message: "Livre non trouvé." });
            }

            // Mettre à jour les champs du livre avec les nouvelles valeurs
            foundBook.title = updatedBookData.title || foundBook.title;
            foundBook.author = updatedBookData.author || foundBook.author;
            foundBook.year = updatedBookData.year || foundBook.year;
            foundBook.genre = updatedBookData.genre || foundBook.genre;

            // Si une nouvelle image est téléchargée, supprimer l'ancienne image et enregistrer la nouvelle
            if (req.file) {
                // Vérifier si le livre a une image associée
                if (foundBook.imageUrl) {
                    // Supprimer l'ancienne image
                    const fileName = foundBook.imageUrl.split('/').pop();
                    const imagePath = path.join(__dirname, '..', 'images', fileName);
                    fs.unlinkSync(imagePath);
                    console.log("Ancienne image supprimée avec succès.");
                }

                // Enregistrer la nouvelle image
                console.log(foundBook.imageUrl);
                foundBook.imageUrl = `${req.protocol}://${req.get('host')}/${req.file.path}`;
            }

            // Sauvegarder les modifications dans la base de données
            foundBook.save()
                .then(updatedBook => {
                    console.log("Livre mis à jour avec succès :", updatedBook);
                    res.status(200).json({ message: "Livre mis à jour avec succès.", updatedBook });
                })
                .catch(error => {
                    console.error("Erreur lors de la mise à jour du livre :", error);
                    res.status(500).json({ error: "Erreur lors de la mise à jour du livre." });
                });
        })
        .catch(error => {
            console.error("Erreur lors de la recherche du livre :", error);
            res.status(500).json({ error: "Erreur lors de la recherche du livre." });
        });
};



// Dans bookController.js
exports.rateBook = async (req, res, next) => {
    const bookId = req.params.id;
    const { rating,userId } = req.body;

    try {
        console.log("UserID:", userId);
        console.log("BookID:", bookId);
        console.log("Rating:", rating);

        if (!bookId) {
            return res.status(400).json({ message: 'ID du livre non fourni.' });
        }

        // Vérifier que la note est comprise entre 0 et 5
        if (rating < 0 || rating > 5) {
            console.log("Invalid rating:", rating);
            return res.status(400).json({ message: 'La note doit être comprise entre 0 et 5.' });
        }

        // Rechercher le livre par son ID
        const book = await Book.findById(bookId);
        console.log("Book found:", book);

        // Si le livre n'est pas trouvé, renvoyer une erreur
        if (!book) {
            console.log("Book not found");
            return res.status(404).json({ message: 'Livre non trouvé.' });
        }

        // Vérifier si l'utilisateur a déjà noté ce livre
        const existingRatingIndex = book.ratings.findIndex(r => r.userId === userId);
        console.log("Existing rating index:", existingRatingIndex);

        // Si l'utilisateur a déjà noté ce livre, renvoyer une erreur
        if (existingRatingIndex !== -1) {
            console.log("User already rated this book");
            return res.status(400).json({ message: 'Vous avez déjà noté ce livre.' });
        }

        // Ajouter la nouvelle note à la liste des notes du livre
        book.ratings.push({ userId, grade: rating });
        console.log("Book with new rating:", book);

        // Calculer la nouvelle note moyenne
        const totalRating = book.ratings.reduce((sum, r) => sum + r.grade, 0);
        book.averageRating = Math.round(totalRating / book.ratings.length);
        console.log("Average rating:", book.averageRating);

        // Enregistrer les modifications du livre
        await book.save();


        // Renvoyer le livre mis à jour en réponse
        res.status(200).json({ message: 'Note du livre mise à jour avec succès.', book });
    } catch (error) {
        // En cas d'erreur, renvoyer une réponse d'erreur avec le message approprié
        console.error("Error:", error);
        res.status(500).json({ message: 'Erreur lors de la notation du livre.' });
    }
};



exports.getBestRatingBook = (req, res, next) => {
    // Trouver les trois livres ayant la meilleure note moyenne
    Book.find()
        .sort({ averageRating: -1 }) // Trier les livres par note moyenne de manière décroissante
        .limit(3) // Limiter le résultat aux trois premiers livres
        .then((bestBooks) => {
            // Afficher le contenu de bestBooks dans la console
            // console.log("Meilleurs livres :", bestBooks);

            // Renvoyer les trois meilleurs livres
            res.status(200).json(bestBooks);
        })
        .catch((error) => {
            // Gérer les erreurs
            // console.error("Erreur lors de la récupération des meilleurs livres :", error);
            res.status(500).json({ error: "Erreur lors de la récupération des meilleurs livres." });
        });

};












