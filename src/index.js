//archivo base de nuestro proyecto

import app from "./app";

const PORT = process.env.PORT || 3306;

app.listen(PORT, () => {
  console.log(`Corriendo en el puerto: ${PORT}`);
});
