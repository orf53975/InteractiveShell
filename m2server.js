var m2 = require('./m2server-module.js');
var m2server = m2.M2Server();
m2server.listen({
    MATH_PROGRAM: 'Singular'
});

// Local Variables:
// indent-tabs-mode: nil
// tab-width: 4
// End:
