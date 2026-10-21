"use strict";

Object.assign(wordex, {
updateJsonOutput() {
        document.getElementById("jsonOutput").value = JSON.stringify(this.document, null, 2);
      },
});
