const { createReadModule, DataStream } = require("scramjet");

module.exports = createReadModule(() => {
    return DataStream
        .from([1,2,3,4,5])
        .map(x => ({x}));
});
