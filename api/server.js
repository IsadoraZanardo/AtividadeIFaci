const express = require("express");
const cors = require("cors");

const api = express();

api.use(cors());
api.use(express.json());

let devices = [
  {
    id: "EQP-001",
    nome: "Sensor Temperatura",
    statusDispositivo: "online",
    conexaoAtiva: true,
    travaLiberada: false,
    ultimaAtualizacao: new Date().toISOString(),

    sensores: {
      temperatura: 25,
      pressao: 2.4,
      umidade: 50,
      sensorPresenca: true,
      releSeguranca: false
    }
  }
];

api.get("/devices", (req, res) => {
  res.json(devices);
});

api.get("/devices/:id", (req, res) => {

  const device = devices.find(
    d => d.id === req.params.id
  );

  if (!device) {
    return res.status(404).json({
      msg: "Dispositivo não encontrado"
    });
  }

  res.json(device);
});

api.post("/devices", (req, res) => {

  const novo = req.body;

  devices.push(novo);

  res.status(201).json({
    msg: "Dispositivo criado com sucesso"
  });
});

api.put("/devices/:id", (req, res) => {

  const index = devices.findIndex(
    d => d.id === req.params.id
  );

  if (index === -1) {
    return res.status(404).json({
      msg: "Dispositivo não encontrado"
    });
  }

  devices[index] = req.body;

  res.json({
    msg: "Dispositivo atualizado"
  });
});

api.patch("/devices/:id/trava", (req, res) => {

  const device = devices.find(
    d => d.id === req.params.id
  );

  if (!device) {
    return res.status(404).json({
      msg: "Dispositivo não encontrado"
    });
  }

  device.travaLiberada =
    !device.travaLiberada;

  res.json({
    msg: "Trava alterada"
  });
});

api.patch("/devices/:id/conexao", (req, res) => {

  const device = devices.find(
    d => d.id === req.params.id
  );

  if (!device) {
    return res.status(404).json({
      msg: "Dispositivo não encontrado"
    });
  }

  device.conexaoAtiva =
    !device.conexaoAtiva;

  res.json({
    msg: "Conexão alterada"
  });
});

api.delete("/devices/:id", (req, res) => {

  const index = devices.findIndex(
    d => d.id === req.params.id
  );

  if (index === -1) {
    return res.status(404).json({
      msg: "Dispositivo não encontrado"
    });
  }

  devices.splice(index, 1);

  res.json({
    msg: "Dispositivo removido"
  });
});

api.delete("/destroy", (req, res) => {

  devices = [];

  res.json({
    msg: "Todos os dispositivos apagados"
  });
});

api.listen(8081, () => {
  console.log(
    "API rodando na porta 8081"
  );
});