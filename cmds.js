
const Sequelize = require('sequelize'); // cargo el modulo Sequelize

const {log, biglog, errorlog, colorize} = require("./out");

const {models} = require('./model'); // saco models de Sequelize con "{}"

/**
* Esta funcion devuelve una promesa que:
*   - Valida que se ha introducido un valor para el parámetro.
*   - Convierte el parámetro en un numero entero.
* Si todo va bien, la promesa se satisface y devuelve el valor de id a usar.
*
* @param id Parámetro con el índice a validar.
*/
const validateId = id => {

    return new Sequelize.Promise((resolve, reject) => {
        if (typeof id === "undefined") {
            reject(new Error(`Falta el parámetro <id>.`));
        } else {
            id = parseInt(id);   // coger la parte entera y descartar lo demas
            if (Number.isNaN(id)) {
                reject(new Error(`El valor del parámetro <id> no es un número.`));
            } else {
                resolve(id); // se resuelve la promesa que yo creo con el id correspondiente
            }
        }
    });
};

/**
* Esta función devuelve una promesa que cuando se cumple, proporciona el texto introducido.
* Entonces la llamada a then hay que hacer la promesa devuelta será:
*       .then(answer => {...})
*
* También colorea en rojo el texto de la pregunta, elimina espacios al principio y final.
*
* @param rl Objeto readline usado para implementar el CLI.
* @param text Pregunta que hay que hacerle al usuario.
*/
const makeQuestion = (rl, text) => {

    return new Sequelize.Promise((resolve, reject) => {
        rl.question(colorize(text, 'red'), answer => {
            resolve(answer.trim());
        });
    });
};

/**
 * Muestra la ayuda.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.helpCmd = (socket, rl) => {
    log(socket, "Commandos:");
    log(socket, "  h|help - Muestra esta ayuda.");
    log(socket, "  list - Listar los quizzes existentes.");
    log(socket, "  show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
    log(socket, "  add - Añadir un nuevo quiz interactivamente.");
    log(socket, "  delete <id> - Borrar el quiz indicado.");
    log(socket, "  edit <id> - Editar el quiz indicado.");
    log(socket, "  test <id> - Probar el quiz indicado.");
    log(socket, "  p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log(socket, "  credits - Créditos.");
    log(socket, "  q|quit - Salir del programa.");
    rl.prompt();
};


/**
 * Lista todos los quizzes existentes en el modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.listCmd = (socket, rl) => { 
    models.quiz.findAll()
    .each(quiz => {
            log(socket, ` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
        })
    .catch(error => {
        errorlog(socket, error.message);
    })
    .then(() => {
        rl.prompt();
    });    
};

/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a mostrar.
 */
exports.showCmd = (socket, rl, id) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }
        log(socket, ` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(error => {
        errorlog(socket, error.message);
    })
    .then(() => {
        rl.prompt();
    });
};

/**
 * Añade un nuevo quiz al modelo.
 * Pregunta interactivamente por la pregunta y por la respuesta.
 *
 * Hay que recordar que el funcionamiento de la funcion rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.addCmd = (socket, rl) => {
    makeQuestion(rl, ' Introduzca una pregunta: ')
    .then(q => {
        return makeQuestion(rl, ' Introduzca la respuesta: ')
        .then(a => {
            return {question: q, answer: a};
        });
    })
    .then(quiz => {
        return models.quiz.create(quiz);
    })
    .then(quiz => {
        log(socket, ` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog(socket, 'El quiz es erroneo: ');
        error.errors.forEach(({message}) => errorlog(socket, message));
    })
    .catch(error => {
        errorlog(socket, error.message);
    })
    .then(() => {
        rl.prompt();
    });
};


/**
 * Borra un quiz del modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.deleteCmd = (socket, rl, id) => {
    validateId(id)
    .then(id => models.quiz.destroy({where: {id}}))
    .catch(error => {
        errorlog(socket, error.message);
    })
    .then(() => {
        rl.prompt();
    });
};


/**
 * Edita un quiz del modelo.
 *
 * Hay que recordar que el funcionamiento de la funcion rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a editar en el modelo.
 */
exports.editCmd = (socket, rl, id) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }

        process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
        return makeQuestion(rl, ' Introduzca la pregunta: ')
        .then(q => {
               process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
               return makeQuestion(rl, ' Introduzca la respuesta: ')
               .then(a => {
                quiz.question = q;
                quiz.answer = a;
                return quiz;
            });
        });
    })
    .then(quiz => {
        return quiz.save();
    })
    .then(quiz => {
        log(socket, ` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog(socket, 'El quiz es erroneo: ');
        error.errors.forEach(({message}) => errorlog(socket, message));
    })
    .catch(error => {
        errorlog(socket, error.message);
    })
    .then(() => {
        rl.prompt();
    });
};


/**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a probar.
 */
exports.testCmd = (socket, rl, id) => {
   validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if(!quiz){
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }
        return makeQuestion(rl, `${quiz.question}? `)
        .then(a => {
            let answerTry = a.trim();
            let answerReal = quiz.answer;
            if (answerTry.toUpperCase() === answerReal.toUpperCase()){
                log(socket, 'CORRECTO');
                biglog(socket, 'CORRECTO', 'green');
            }else{
                log(socket, 'INCORRECTO');
                biglog(socket, 'INCORRECTO', 'red');
            }
        });

    })
    .catch(Sequelize.ValidationError, error => {
        errorlog(socket, 'El quiz es erroneo: ');
        error.errors.forEach(({message}) => errorlog(socket, message));
    })
    .catch(error => {
        errorlog(socket, error.message);
    })
    .then(() => {
        rl.prompt();
    });    
};


/**
 * Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todos satisfactoriamente.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.playCmd = (socket, rl) => {
    let score = 0;
    let toBeResolved = [];
    let id = 0;
    models.quiz.findAll()
    .then(quizzes =>{
        toBeResolved = quizzes;
    })

    const rand = (min, max) => {
        return Math.random() * (max - min) + min;
    };

    const playOne = () => {

            models.quiz.findAll()
            .then(quizzes => {
                const long = quizzes.length;
        
                if (score === long){
                    log(socket, `${colorize('No hay más preguntas', 'green')}`);
                    log(socket, `Fin del juego. Has acertado un total de ${score} preguntas.`);
                    biglog(socket, `${score}`, 'magenta');
                    rl.prompt();
                }else{
                    id = Math.floor(rand(0, toBeResolved.length));
                    validateId(id)
                    .then(id => toBeResolved[id])
                    .then(quiz => {
                        if(!quiz){
                            throw new Error(`No existe un quiz asociado al id=${id}.`);
                        }
                        return makeQuestion(rl, `${quiz.question}?`)
                        .then(a => {
                            //console.log(`id: ${id}`);
                            let answerTry = a.trim();
                            let answerReal = quiz.answer;
                            if (answerTry.toUpperCase() === answerReal.toUpperCase()){
                                log(socket, 'CORRECTO');
                                score++;
                                log(socket, `Aciertos: ${score}`)
                                biglog(socket, `${score}`, 'magenta');
                                toBeResolved.splice(id, 1);
                                playOne();
                            }else{
                                log(socket, 'INCORRECTO.');
                                log(socket, `Fin del juego. Has acertado un total de ${score} preguntas.`);
                                biglog(socket, `${score}`, 'magenta');
                                rl.prompt();

                            }
                        });

                    });
                }

            })
            
             .catch(Sequelize.ValidationError, error => {
            errorlog(socket, 'El quiz es erroneo: ');
             error.errors.forEach(({message}) => errorlog(socket, message));
            })
            .catch(error => {
            errorlog(socket, error.message);
            })
            .then(() => {
            rl.prompt();
            });
        }

        playOne();
};


/**
 * Muestra los nombres de los autores de la práctica.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.creditsCmd = rl => {
    log(socket, 'Autores de la práctica:');
    log(socket, 'Jesús Sousa Herranz', 'green');
    log(socket, 'Agustín Rivero Ibáñez', 'green');
    rl.prompt();
};


/**
 * Terminar el programa.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.quitCmd = (socket, rl) => {
    rl.close(); // cierro el readline
    socket.end(); // envio finalizacion del socket y vacio lo que este pendiente por enviar
};

