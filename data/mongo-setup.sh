#!/bin/bash
set -e

mongosh --eval "
  db = db.getSiblingDB('admin');
  db.createUser({
    user: 'root',
    pwd: 'example',
    roles: [
      { role: 'root', db: 'admin' },
      { role: 'userAdminAnyDatabase', db: 'admin' },
      { role: 'dbAdminAnyDatabase', db: 'admin' },
      { role: 'readWriteAnyDatabase', db: 'admin' }
    ]
  });

  db = db.getSiblingDB('burnickdb');
  db.createUser({
    user: 'root',
    pwd: 'example',
    roles: [
      { role: 'dbOwner', db: 'burnickdb' },
      { role: 'readWrite', db: 'burnickdb' }
    ]
  });

  db.createCollection('users');
  db.createCollection('pages');
"

# After user creation, restart MongoDB with auth enabled
mongod --shutdown
echo "auth = true" >> /etc/mongod.conf
mongod --bind_ip_all --auth