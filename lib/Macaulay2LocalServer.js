var Macaulay2Server = require('./mathServer.js').MathServer({
    MATH_PROGRAM: 'Macaulay2',
    MATH_PROGRAM_COMMAND: 'M2'
});
Macaulay2Server.listen();