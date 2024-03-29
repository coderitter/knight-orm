# Knight ORM by Coderitter

A very leight-weight ORM which takes your object trees and stores them into the database. It also supports [knight-criteria](https://github.com/c0deritter/knight-criteria) for simple yet powerful definition of database queries.

## Dependencies

This package uses [knight-criteria](https://github.com/c0deritter/knight-criteria) for its query interface and in the background [knight-sql](https://github.com/c0deritter/knight-sql) for representing SQL strings.

## Related packages

For PostgreSQL databases there is also a package for migrations [knight-pg-migration](https://github.com/c0deritter/knight-pg-migration) and a package for transaction handling [knight-pg-transaction](https://github.com/c0deritter/knight-pg-transaction).

There is also an in-memory object database [knight-object-db](https://github.com/c0deritter/knight-object-db) if you are looking for something which can be used in a browser.

## Install

`npm install knight-orm`

## Quickstart

Define your domain object.

```typescript
class Knight {
  id: number
  name: string
}
```

Create the database table. The example is based on a PostgreSQL database.

```sql
CREATE TABLE knight (id SERIAL, name VARCHAR(100));
```

Define the schema.

```typescript
import { Schema } from 'knight-orm'

let schema = new Schema

schema.addTable('knight', {
  columns: {
    'id': { property: 'id', primaryKey: true, generated: true },
    'name': 'name'
  },
  newInstance: () => new Knight
})
```

Adopt your database. The example is based on a PostgreSQL database.

```typescript
import { Pool } from 'pg'
let pool = new Pool({ ... })

function queryFn(sqlString: string, values?: any[]): Promise<any> {
  return pool.query(sqlString, values)
}
```

Instantiate the ORM and work with it.

```typescript
let orm = new Orm(schema, 'postgres')
let luisa = new Knight('Luisa')

await orm.store(queryFn, luisa) // INSERT or UPDATE
await orm.load(queryFn, Knight, { name: 'Luisa' })
await orm.count(queryFn, Knight)
await orm.delete(queryFn, luisa)
```

## Overview

The package consists of the following classes.

- `Schema`: Holds the essential information to be able to map entities from the database world to the object world and vice verca.
- `Orm`: It is the heart of this package. It contains the methods to store, delete, load and count entities, but also other useful tools to work with different aspects of the object-relational mapping.

## Glossary

We are using some terms here we try to be precise with.

An **object** is a programming language concept. It comprises **properties** and **methods**. The composition of such an object is defined in a **class**, while the actual value you are working with is instantiated from a class and called **instance**. Thus, the programming language uses two constructs, classes and instances, to implement the concept object. If we do not care about the differentiation between a class and an instance, we just use the word object.

Objects are used to define the concepts of a domain, for example knights and castles. Those objects are called **domain objects**. Objects are also used to represent a **row** of a database **table**, where every object property represents a database **column**. This is especially true in JavaScript/TypeScript, where objects can be composed on runtime without the need of instantiating from a class, while in other programming languages like Java you would use a map instead. Thus, it is difficult to denote the domain object of the programming language world as an object, the O of ORM, because an object is used for both, representing a domain object and a database row. We use the term instance instead.

An **entity** is a word that comes from the database world, but it has the general meaning of a thing in existence. The term object also goes into that direction, but it is also has the programming language constructs implementing it in mind. Thus, entity is a more general term than object. In a database, we store entities, not objects. Since entity is this broad term, we refer to an entity stored in a database as a row. When it is clear, that we target the database world, we use the word entity.

## Defining a schema

The schema tells the ORM how the object world relates to the database world. With it, it can map one to the other and the other way around.

A schema consists of the following pieces. The bold ones are mandatory while the italic ones are optional.

- **Column mapping**: Maps database column names to object property names
- *Relationship definitions*: Maps the relationships between database tables to relationships between objects
- **Instance creating function**: A function that creates an instance of the corresponding class of the object world
- *Row to instance function*: A function that takes a database row and creates an instance out of it
- *Instance to row function*: A function that takes an instance and creates a database row out of it

Adding a schema for one table looks like this.

```typescript
import { Schema } from 'knight-orm'

let schema = new Schema

schema.addTable('knight', {
  columns: {
    'id': { property: 'id', primaryKey: true, generated: true },
    'name': 'name'
  },
  relationships: {},
  newInstance: () => new Knight,
  rowToInstance: (row: any, knight: Knight) => { ... },
  instanceToRow: (knight: Knight, row: any) => { ... }
})
```

The schema class has a method `check` which can be used to find inconsistencies within the mapping. It will throw an error with a sophisticated error message which will help you debugging.

```typescript
schema.check()
```

If you do not call this method, the checks will be done when the corresponding definitions are used, which might be far later into the program or even never.

### Mapping columns

Mapping columns is done through an object, which keys are database columns and which values are property names of your domain object.

```typescript
schema.addTable('table', {
  columns: {
    'database_column': 'propertyName'
  }
})
```

You also need to define a primary key. The `store` method will check, if all primary key columns are set. If they are not, it will throw an error.

```typescript
schema.addTable('table', {
  columns: {
    'id': {
      property: 'id',
      primaryKey: true
    }
  }
})
```

Most of the database systems offer to generate an incremental id value. If you are using this feature, you need to declare it in the schema.

```typescript
schema.addTable('table', {
  columns: {
    'id': {
      property: 'id',
      primaryKey: true,
      generated: true
    }
  }
})
```

### Mapping relationships

A relationship is between two database tables. There are the two fundamental types `many-to-one` and `one-to-many`. The other known types `one-to-one` and `many-to-many` are realized through a combination of the former.

A `many-to-one` is mapped to a property which holds a reference to another object. A `one-to-many` is mapped to a property holding an array of object references.

```typescript
let instance = {
  manyToOne: {},
  oneToMany: [{}, {}, {}]
}
```

#### Many-To-One

A `many-to-one` relationship is when a row of a table explicitely references a row of another table. Of course, the other table might also be the same table or the other row might also be the same row.

Let us assume, that a knight lives in exactly one castle. You will need an additional column `lives_in_castle_id` in the table `knight` which references a primary key column of the table `castle`.

```sql
CREATE TABLE knight (id SERIAL, name VARCHAR(100), lives_in_castle_id INTEGER);
CREATE TABLE castle (id SERIAL, name VARCHAR(100));
```

To be able to map that column into the object world, you also need an additional property `livesInCastleId` in the class `Knight`. To be able to work with the relationship in the object world, you also need a property `livesInCastle`, which references an instance of class `Castle`.

```typescript
class Knight {
  id: number
  name: string
  
  livesInCastleId: number
  livesInCastle: Castle
}

class Castle {
  id: number
  name: string
}

let luisa = new Knight('Luisa')
luisa.livesInCastle = new Castle('Kingstone')
```

Now you can create the relationship mapping for the table `knight`. Relationships are defined in an object which keys are the names of the properties holding the referenced instances. In our `many-to-one` example it is the property `livesInCastle` of the class `Knight`. The referenced schema object defines the id `thisId` of this table, which references the id `otherId` of the `otherTable`.

```typescript
import { Schema } from 'knight-orm'

let schema = new Schema

schema.addTable('knight', {
  columns: {
    'id': { property: 'id', primaryKey: true, generated: true },
    'name': 'name',
    'lives_in_castle_id': 'livesInCastleId'
  },
  relationships: {
    'livesInCastle': {
      manyToOne: true,
      thisId: 'lives_in_castle_id',
      otherTable: 'castle',
      otherId: 'id'
    }
  },
  newInstance: () => new Knight
})
```

Now, when you store a `Knight` instance, the ORM will also store the `Castle` instance. When you load a `Knight` and you explictely declared it, the ORM will also load the related `Castle` instance into the `livesInCastle` property.

```typescript
orm.store(queryFn, knight)
orm.load(queryFn, Knight, { livesInCastle: { '@load': true }})
```

#### One-To-Many

A `one-to-many` relationship is, when the row of one table is explicitely referenced many times by `many-to-one` relationships of rows from another table. This means, that this kind of a relationship is the implicit counterpart of a `many-to-one` relationship. If you define a `many-to-one` relationship, the `one-to-many` relationship is inherently there.

Let us go back to our knight/castle relationship. Now that we know in which castle a knight lives in, we also want to know, which knights live in which castles.

To do this, we do not need to add additional columns to any table, but we add an additional property `knightsLivingHere` to our domain object castle.

```typescript
class Castle {
  id: number
  name: string

  knightsLivingHere: Knight[]
}
```

Here comes the relationship mapping for the table `castle`.

```typescript
import { Schema } from 'knight-orm'

let schema = new Schema

schema.addTable('castle', {
  columns: {
    'id': { property: 'id', primaryKey: true, generated: true },
    'name': 'name'
  },
  relationships: {
    'knightsLivingHere': {
      oneToMany: true,
      thisId: 'id',
      otherTable: 'knight',
      otherId: 'lives_in_castle_id'
    }
  },
  newInstance: () => new Castle
})
```

Now, when you store a `Castle` instance, the ORM will also store the referenced `Knight` instances living there. When you load a `Castle` instance and you explictely declared it, the ORM will also load the `Knight` instances into the `knightsLivingHere` array property.

```typescript
orm.store(queryFn, knight)
orm.load(queryFn, Knight, { knightsLivingHere: { '@load': true }})
```

#### Many-To-Many

The `many-to-many` relationship is when both tables refer to each other in an `one-to-many` relationship. To achieve this, another table is placed in between which refers to each table with a `many-to-one` relationship. Of course, the table in between might even refer to more than two tables.

Again using our example from above, we also want to store the date a knight moved into a castle. With that data structure, we do not only know in which castle a knight lives right know, but we are also getting a history of castles a knight was living in.

We add the table in between.

```sql
CREATE TABLE knight_living_in_castle (knight_id INTEGER, castle_id INTEGER, moved_in DATE);
```

We add a domain object for the table in between and adjust the `Knight` and `Castle` classes to refer to the new domain object in between.

```typescript
class Knight {
  id: number
  name: string
  
  livesInCastles: KnightLivingInCastle[]
}

class Castle {
  id: number
  name: string

  knightsLivingHere: KnightLivingInCastle[]
}

class KnightLivingInCastle {
  knightId: number
  castleId: number
  movedIn: Date

  knight: Knight
  castle: Castle
}

let luisa = new Knight('Luisa')
let kingstone = new Castle('Kingstone')
let livingIn = new KnightLivingInCastle(luisa, kingstone)
luisa.livesInCastles = [ livingIn ]
kingstone.knightsLivingHere = [ livingIn ]
```

As you can see, the `Knight` and the `Castle` refer to a list of `KnightLivingInCastle`, while the latter refers to exactly one of the former.

Let us map this.

```typescript
import { Schema } from 'knight-orm'

let schema = new Schema

schema.addTable('knight', {
  columns: {
    'id': { property: 'id', primaryKey: true, generated: true },
    'name': 'name'
  },
  relationships: {
    'livesInCastles': {
      oneToMany: true,
      thisId: 'id',
      otherTable: 'knight_living_in_castle',
      otherId: 'knight_id'
    }
  },
  newInstance: () => new Knight
})

schema.addTable('castle', {
  columns: {
    'id': { property: 'id', primaryKey: true, generated: true },
    'name': 'name'
  },
  relationships: {
    'knightsLivingHere': {
      oneToMany: true,
      thisId: 'id',
      otherTable: 'knight_living_in_castle',
      otherId: 'castle_id'
    }
  },
  newInstance: () => new Castle
})

schema.addTable('knight_living_in_castle', {
  columns: {
    'knight_id': { property: 'knightId', primaryKey: true },
    'castle_id': { property: 'castleId', primaryKey: true },
    'moved_in': 'movedIn'
  },
  relationships: {
    'knight': {
      manyToOne: true,
      thisId: 'knight_id',
      otherTable: 'knight',
      otherId: 'id'
    },
    'castle': {
      manyToOne: true,
      thisId: 'castle_id',
      otherTable: 'castle',
      otherId: 'id'
    }
  },
  newInstance: () => new KnightLivingInCastle
})
```

Now, when you store a `Knight`, a `Castle` or a `KnightLivingInCastle`, the ORM will also store the referenced instances belonging to the `many-to-many` relationship. When you load one of the mentioned and you explictely declared it, the ORM will also load every instance related to the `many-to-many` relationship into its corresponding properties.

```typescript
// you only need one the three calls to store
orm.store(queryFn, knight)
orm.store(queryFn, castle)
orm.store(queryFn, livingIn)

orm.load(queryFn, Knight, {
  livesInCastles: {
    '@load': true,
    castle: {
      '@load': true
    }
  }
})

orm.load(queryFn, Castle, {
  knightsLivingHere: {
    '@load': true,
    knight: {
      '@load': true
    }
  }
})

orm.load(queryFn, KnightLivingInCastle, {
  knight: {
    '@load': true
  },
  castle: {
    '@load': true
  }
})
```

#### One-To-One

A `one-to-one` relationship is when two `many-to-one` relationships refer to each other. This means, that the other side of the `many-to-one` relationship has also a `many-to-one` relationship, which refers back to the same entity.

Let us create a relationship between a knight and its armor. One knight owns exactly one armor and one armor is exactly owned by one knight. We are defining a foreign key `owns_armor_id` for the table `knight` and a foreign key `owned_by_knight_id` for the table `armor`.

```sql
CREATE TABLE knight (id SERIAL, owns_armor_id INTEGER);
CREATE TABLE armor (id SERIAL, owned_by_knight_id INTEGER);
```

When we create the domain objects, we add properties representing the database columns and properties which reference the domain object.

```typescript
class Knight {
  id: number
  ownsArmorId: number
  ownsArmor: Armor
}

class Armor {
  id: number
  ownedByKnightId: number
  ownedByKnight: Knight
}

let luisa = new Knight
let armor = new Armor

luisa.armor = armor
armor.knight = luisa
```

When we map a `one-to-one` relationship, we specify an additional property `otherRelationship`, which denotes the other `many-to-one` relationship referencing back.

```typescript
import { Schema } from 'knight-orm'

let schema = new Schema

schema.addTable('knight', {
  columns: {
    'id': { property: 'id', primaryKey: true, generated: true },
    'owns_armor_id': 'ownsArmorId'
  },
  relationships: {
    'ownsArmor': {
      manyToOne: true,
      thisId: 'owns_armor_id',
      otherTable: 'armor',
      otherId: 'id',
      otherRelationship: 'ownedByKnight'
    }
  },
  newInstance: () => new Knight
})

schema.addTable('armor', {
  columns: {
    'id': { property: 'id', primaryKey: true, generated: true },
    'owned_by_knight_id': 'ownedByKnightId'
  },
  relationships: {
    'ownedByKnight': {
      manyToOne: true,
      thisId: 'owned_by_knight_id',
      otherTable: 'knight',
      otherId: 'id',
      otherRelationship: 'ownsArmor'
    }
  },
  newInstance: () => new Armor
})
```

Now you can store a knight along with its armor and the ORM will automatically assign the involved foreign keys.

```typescript
let luisa = new Knight
let armor = new Armor

luisa.armor = armor
armor.knight = luisa

let result = await orm.store(luisa)

luisa.ownsArmorId == 1
knight.ownedByKnightId == 1

result == {
  id: 1,
  '@update': false,
  ownsArmor: {
    id: 1,
    '@update': false
  }
}
```

### Creating the instance

For the ORM to be able to create instances of the correct class after loading database rows, you need to give it functions that do this. These do not get any parameter and return a new instance of one of your domain classes.

```typescript
orm.addTable('knight', {
  ...
  'newInstance': () => new Knight
})
```

As you can see, you will need a no-argument constructor.

To achieve this in typescript scrict mode, you can set all of your properties to optional by using the question mark.

```typescript
class Knight {
  id?: number
  name?: number

  constructor() {}
}
```

This is bad if you want to give the user of the class guidance on which properties are mandatory, but then again, you should check every instance on correctness before it is stored into the database anyway. This validation will furthermore contain many more checks like that the `name` property of the knight must not exceed 100 characters.

There is a knight library [knight-validation](https://github.com/c0deritter/knight-validation) for this task. There you can combine validators to be also able to check the attached relationship objects.

### Customizing the row/instance conversion

The ORM will automatically create database row objects out of your domain instances and vice versa. It will do so by simply copying every value of the one object to the other while regarding the difference of the property names.

There will be occassions where you need to for example convert an object into a JSON string to store it into the database and parse that string into an object when you retrieve it from the database.

To do so, you can attach two custom functions, one for converting a domain instance into a database row and one for the other way around.

```typescript
orm.addTable('knight', {
  ...
  'instanceToRow': (knight: Knight, row: any) => {
    row.languages = JSON.stringify(knight.languages)
  },
  'rowToInstance': (row: any, knight: Knight) => {
    knight.languages = JSON.parse(row.languages)
  }
})
```

Both of the functions get the source object as the first parameter and the ORM-converted object as the second parameter. That way, you only need to adjust what you really need to while you can leave the rest to the ORM.

## Using the Orm

The Orm is the central class you will be working with after you defined the schema. It consists of the following.

- `store()`: Stores either an instance or database row object into the database along with its attached relationship objects. It automatically determines if to use an SQL `INSERT` or `UPDATE`.
- `delete()`: Deletes either an instance or a database row object from the database. It does not automatically delete attached relationship objects.
- `load()`: Uses [knight-criteria](https://github.com/c0deritter/knight-criteria) to load either instances or database row objects along with their relationship objects from the database.
- `count()`: Uses [knight-criteria](https://github.com/c0deritter/knight-criteria) which either reference instance properties or database columns to count entities.
- `criteriaUpdate()`: Updates a bunch of database rows that match given [knight-criteria](https://github.com/c0deritter/knight-criteria) which either reference instance properties or database columns.
- `criteriaDelete()`: Delete a bunch of database rows that match given [knight-criteria](https://github.com/c0deritter/knight-criteria) which either reference instance properties or database columns.
- `criteriaTools`: An object containing methods to work with [knight-criteria](https://github.com/c0deritter/knight-criteria).
- `objectTools`: An object containing methods to work with either instances or database rows.
- `queryTools`: An object containing methods to work with database queries which are based on [knight-sql](https://github.com/c0deritter/knight-sql).

The methods `store()`, `delete()`, `load()` and `count()` are your main work horses. The methods `criteriaUpdate()` and `criteriaDelete()` might occasionally come in handy. The tools sub objects yield sophisticated functionality which you will be using if you need more adjusted behaviour. 

### Instantiating

After you defined a schema you are ready to instantiate the ORM.

```typescript
import { Orm } from 'knight-orm'

let orm = new Orm(schema, 'postgres')
```

The second parameter denotes the database system which you will be using. At the moment there is support for `postgres`, `mysql` and `maria`.

### The query function

The query function is a parameter for all methods that access the database. It is the tool to adopt your database system to work with this package. The only thing you need to do is to define a function which forwards its parameters to a function which can acutally query your database system.

```typescript
import { Pool } from 'pg'
let pool = new Pool({ ... })

function queryFn(sqlString: string, values?: any[]): Promise<any> {
  return pool.query(sqlString, values)
}
```

The first parameter is the SQL string and the second one the array of values which the connector of your database system will use to replace the parameters in the given SQL string.

This function is the key to be able to wrap the method calls of the ORM inside a database transaction. Just use an explicit connection instead of a pool.

```typescript
let client = await pool.connect()
let queryFn = (sqlString: string, values?: any[]) => client.query(sqlString, values)

await client.query('BEGIN')

try {
  await orm.store(queryFn, knight)
  await client.query('COMMIT')
}
catch (e) {
  await client.query('ROLLBACK')
}
finally {
  client.release()
}
```

To help with transactions, there is the package [knight-pg-transaction](https://github.com/c0deritter/knight-pg-transaction) and [knight-maria-transaction](https://github.com/c0deritter/knight-maria-transaction). You can find more information on how to combine those packages with the ORM further down.

Note that in case of PostgreSQL, the SQL string is extended with a `RETURNING` statement if it is an `INSERT` query. It is needed to retrieve the auto generated primary key column but it will also cause problems if you already declared your own `RETURNING` statement.

### Store

The `store()` method inserts or updates a given object, which can either be an instance of a domain class or an object representing a database row. It will also store every attached relationship objects.

#### Insert

The store method will insert a given instance of a domain object class.

```typescript
let luisa = new Knight('Luisa')
orm.store(queryFn, luisa)
```

If a primary key column is generated by the database, it will set this generated id on the given object.

```typescript
knight.id === 1
```

#### Update

If the primary key values on the given object are set, it will check if the given entity was already inserted into the database. In case of a generated primary key value, it will automatically assume that the entity was already inserted. In case of a not generated primary key value, it will do a database `SELECT` query to find out.

```typescript
let ramon = new Knight
ramon.id = 1
ramon.name = 'Ramon'
orm.store(queryFn, ramon)
```

#### The return value

It will return information about if the given objects were inserted or updated.

```typescript
let luisa = new Knight('Luisa')
let result = await orm.store(queryFn, luisa)

result == {
  id: 1,
  '@update': false
}

luisa.name = 'Ramon'
result = await orm.store(queryFn, luisa)

result == {
  id: 1,
  '@update': true
}
```

#### Use database row objects

Instead of using instances of domain classes, you can also use objects representing database rows. In that case, every object property represents a database column name. The names of the relationship properties stay the same. The store method will also set the generated primary key values on the given row object and it will also return the same kind of result, but using column names for its properties.

```typescript
let row = {
  name: 'Luisa'
}

// The last parameter 'asDatabaseRow' is set to true
let result = await orm.store(queryFn, schema.getTable('knight'), row, true)

row.id == 1

result == {
  id: 1,
  '@update': false
}
```

Instead of using the table object of the schema, you can also use the constructor function as a parameter. In case of an instance that is typed with the class of a domain object, this parameter is optional, because the store method will extract the class name from the given instance.

```typescript
orm.store(queryFn, Knight, row, true)
```

#### Relationships

The store method will store every attached relationship objects, be it `many-to-one` or `one-to-many`. It will also set the values of the foreign key columns. The returned result will contain the information, if the relationship object was inserted or updated.

Here, we store the instance of class `Castle` which is referenced by the `many-to-one` relationship `livesInCastle`.

```typescript
let luisa = new Knight('Luisa')
let kingstone = new Castle('Kingstone')
luisa.livesInCastle = kingstone

let result = await orm.store(queryFn, luisa)

luisa.id == 1
// The ORM set the foreign key column value
luisa.livesInCastleId == 1
kingstone.id == 1

result == {
  id: 1,
  '@update': false,
  livesInCastle: {
    id: 1,
    '@update': false
  }
}
```

Here, we store the instances of class `Knight` which are referenced by the `one-to-many` relationship `knightsLivingHere`.

```typescript
let kingstone = new Castle('Kingstone')
let luisa = new Knight('Luisa')
let ramon = new Knight('Ramon')
kingstone.knightsLivingHere = [ luisa, ramon ]

let result = await orm.store(queryFn, kingstone)

castle.id == 1

luisa.id == 1
luisa.livesInCastleId = 1

ramon.id == 2
ramon.livesInCastleId = 1

result == {
  id: 1,
  '@update': false,
  knightsLivingHere: [
    {
      id: 1,
      '@update': false
    },
    {
      id: 2,
      '@update': false
    }
  ]
}
```

The store function tries to store the `many-to-one` objects first, before it stores the actual object which was given through the parameter. This enables you to use foreign key constraints in your database. Beware, that there will be situations, where the `many-to-one` object has to be stored afterwards, i.e. if the referenced object is the same as the referencing object.

Of course, you do not have to reference another object to store a `many-to-one` relationship. You can also set the foreign key value directly.

```typescript
let luisa = new Knight('Luisa')
luisa.livesInCastleId = 1
orm.store(queryFn, luisa)
```

To check relationship objects for correctness, take a look into the package [knight-validation](https://github.com/c0deritter/knight-validation). It allows to combine domain object specific validators.

### Delete

The `delete()` method takes a domain instance or a database row and deletes the corresponding entity from the database.

```typescript
orm.delete(queryFn, knight)
```

This method does not delete any relationships from the database. It only deletes the given entity. You need to implement it by yourself.

### Load

The `load()` method uses [knight-criteria](https://github.com/c0deritter/knight-criteria) to offer a simple yet powerful way to define an SQL query. We will cover most of the possibilities in the upcoming sections, still we advise you to use the [documentation](https://github.com/c0deritter/knight-criteria#readme) when you create your own criteria.

#### Basics

You can specify criteria objects which properties will denote the properties of your domain object. Every defined criterium in one criteria object will be `AND` connected. The following examples are not exhaustive. Please refer to the [knight-criteria documentation](https://github.com/c0deritter/knight-criteria#readme) to get the complete overview.

```typescript
// load all knights which id's are 1
load(queryFn, Knight, { id: 1 })

// load all knights which id's are between 1 and 10 and which names start with 'L'
load(queryFn, Knight, {
  id: [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ],
  name: {
    '@operator': 'LIKE',
    '@value': 'L%'
  }
})
```

You can order, limit and offset the result.

```typescript
load(queryFn, Knight, {
  '@orderBy': 'name',
  '@limit': 10,
  '@offset': 10
})
```

There is also a criteria array which contains criteria objects or further criteria arrays. Each element of the array is by default `OR` connected, but you can also specify the logical operator explicitely.

```typescript
// load all knights which id's are between 1 and 10 or which names start with 'L'
load(queryFn, Knight, [
  {
    id: [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]
  },
  'XOR',
  {
    name: {
      '@operator': 'LIKE',
      '@value': 'L%'
    }
  }
])
```

#### Use criteria that denote database columns

Instead of denoting domain object properties in the criteria objects, you can also denote database columns.

```typescript
// The last parameter 'asDatabaseCriteria' is set to true
load(queryFn, Knight, {
  'lives_in_castle_id': 1
}, true)
```

#### Relationships

You can also define criteria for relationships. The load method will join the corresponding tables and will add the given criteria to the SQL query. This means, that the relationship criteria will have an effect on the number of loaded entities. If a relationship owning entity does not have at least one relationship entity that matches the given relationship criteria, it will not be loaded.

In the following example, we load only those knights which live in the castle with `name = 'Kingstone'`.

```typescript
load(queryFn, Knight, {
  livesInCastle: {
    name: 'Kingstone'
  }
})
```

It is also possible to load the castles by setting the `@load` property to true.

```typescript
load(queryFn, Knight, {
  livesInCastle: {
    '@load': true,
    name: 'Kingstone'
  }
})
```

If you do not want the relationship criteria to influence the number of loaded entities, you can also load the relationship entities in a separate SQL query. Here we load all castles and for every castle only those knights which names start with `L`.

```typescript
load(queryFn, Castle, {
  knightsLivingHere: {
    '@loadSeparately': true,
    name: {
      '@operator': 'LIKE',
      '@value': 'L%'
    }
  }
})
```

If you are using the criteria array, you can also specify if to load a relationship. You only need to specify it once and it does not matter in which place you do it.

```typescript
load(queryFn, Knight, [
  {
    livesInCastle: {
      '@load': true,
      name: 'Kingstone'
    }
  },
  {
    livesInCastle: {
      name: 'Albrechtscastle'
    }
  }
])
```

If you are having a complex criteria array, you can use a dummy criteria object at the start, define every relationship that is to be loaded there and the rest afterwards.

```typescript
load(queryFn, Knight, [
  {
    livesInCastle: {
      '@load': true
    }
  },
  {
    livesInCastle: {
      name: 'Kingstone'
    }
  },
  {
    livesInCastle: {
      name: 'Albrechtscastle'
    }
  }
])
```

Of course, this example can be solved in a more elegant way, which we did not do because we just wanted to showcase the point.

```typescript
load(queryFn, Knight, [
  {
    livesInCastle: {
      '@load': true
    }
  },
  {
    livesInCastle: {
      name: [ 'Kingstone', 'Albrechtscastle' ]
    }
  }
])
```

#### Use custom functions when loading relationship entities

### Count

The `count()` method also uses [knight-criteria](https://github.com/c0deritter/knight-criteria) to offer a simple yet powerful interface to count entities.

It works just like the load method with the differences, that it returns a number.

```typescript
let count = await orm.count(queryFn, Knight, {
  name: {
    '@operator': 'LIKE',
    '@value': 'L%'
  }
})
```

If you are specifying relationship criteria, setting the `@load` property to `true` will have no effect. If you set `@loadSeparately` to `true`, the relationship criteria are going to be ignored. Both of the properties only make sense in the context of the load method.

For further information on how to create criteria, refer to the [knight-criteria documentation](https://github.com/c0deritter/knight-criteria#readme).

### Update with criteria

The `criteriaUpdate()` method lets you create an SQL `UPDATE` query by using criteria.

Let us assume, that all knights should move from the castle with `id = 1` to castle with `id = 2`. To do so, you define `UpdateCriteria` where you denote every property which should change and criteria which specify all the entities in the database for which the given values should be applied.

```typescript
import { UpdateCriteria } from 'knight-orm'

let updateCriteria: UpdateCriteria = {
  livesInCastleId: 2,
  '@criteria': {
    livesInCastleId: 1
  }
}

let result = await orm.criteriaUpdate(queryFn, Knight, updateCriteria)
```

The returned result is the one your database connector would return.

Instead of denoting domain object properties, you can also denote database columns.

```typescript
import { UpdateCriteria } from 'knight-orm'

let updateCriteria: UpdateCriteria = {
  lives_in_castle_id: 2,
  '@criteria': {
    lives_in_castle_id: 1
  }
}

// The last parameter 'asDatabaseCriteria' is set to true
let result = await orm.criteriaUpdate(queryFn, Knight, updateCriteria, true)
```

### Delete with criteria

The `criteriaDelete()` method lets you create an SQL `DELETE` query by using criteria.

Let us assume, that the castle with `id = 1` got overrun by the enemy and every knight in it died.

```typescript
import { Criteria } from 'knight-criteria'

let criteria: Criteria = {
  livesInCastleId: 1,
}

let result = await orm.criteriaDelete(queryFn, Knight, criteria)
```

The returned result is the one your database connector would return.

Instead of denoting domain object properties, you can also denote database columns.

```typescript
import { Criteria } from 'knight-criteria'

let criteria: Criteria = {
  lives_in_castle_id: 1,
}

// The last parameter 'asDatabaseCriteria' is set to true
let result = await orm.criteriaDelete(queryFn, Knight, criteria, true)
```

## Combine with knight-transaction