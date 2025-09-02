db = db.getSiblingDB("admin");

db.createUser({
  user: "root",
  pwd: "example",
  roles: [
    { role: "root", db: "admin" },
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "dbAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" },
  ],
});

db = db.getSiblingDB("burnickdb");

db.createUser({
  user: "root",
  pwd: "example",
  roles: [
    { role: "dbOwner", db: "burnickdb" },
    { role: "readWrite", db: "burnickdb" },
  ],
});

// Create initial collections
db.createCollection("users");
db.createCollection("pages");
