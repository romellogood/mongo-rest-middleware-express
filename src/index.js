import {MongoClient, ObjectId} from 'mongodb';

let mongoDB = null;

/**
 * Extract the inputs from the request
 * @param {Object} req express request object
 * @return {Void} returns nothing
 */
function extractInputs (req) {
  const {body, method, params, query, url} = req;
  const {collection} = params;

  const queryKeys = Object.keys(query);
  const newQuery = queryKeys.reduce((result, key) => {
    result[key]
      = {
        _id: query._id && ObjectId(query._id)
      }[key] || query[key];

    return result;
  }, {});

  return {body, collection, method, params, query: newQuery, req, url};
}

/**
 * Delete a document
 * @param {Object} req express request object
 * @param {Object} res express response object
 * @return {Void} returns nothing
 */
function deleteMethod (req, res) {
  const {collection, method, query, url} = extractInputs(req);

  console.log('DELETE:', url);

  mongoDB.collection(collection).findOneAndDelete(query, (err, {value}) => {
    if (err) {
      console.log(
        'An error occured while querying with the criteria',
        JSON.stringify(query)
      );
      console.log(err);
      throw new Error(err);
    }

    res.json({
      collection,
      document: value,
      method,
      searchCriteria: query
    });
  });
}

/**
 * Retrieve any document matching the search criteria
 * @param {Object} req express request object
 * @param {Object} res express response object
 * @return {Void} returns nothing
 */
function get (req, res) {
  const {collection, method, query, url} = extractInputs(req);

  console.log('GET:', url);

  mongoDB
    .collection(collection)
    .find(query)
    .toArray((err, documents) => {
      if (err) {
        console.log(
          'An error occured while querying with the criteria',
          JSON.stringify(query)
        );
        console.log(err);
        throw new Error(err);
      }

      res.json({
        collection,
        documents,
        method,
        searchCriteria: query
      });
    });
}

/**
 * Patch fields in a document
 * @param {Object} req express request object
 * @param {Object} res express response object
 * @return {Void} returns nothing
 */
function patch (req, res) {
  const {body, collection, method, query, url} = extractInputs(req);

  console.log('PATCH:', url);

  mongoDB
    .collection(collection)
    .findOneAndUpdate(
      {query},
      {$set: body},
      {returnNewDocument: true},
      (err, {value}) => {
        if (err) {
          console.log(
            'An error occured while patching a document',
            'search criteria',
            JSON.stringify(query),
            'new document',
            JSON.stringify(body)
          );
          console.log(err);
          throw new Error(err);
        }

        res.json({
          collection,
          document: value,
          method,
          searchCriteria: query
        });
      }
    );
}

/**
 * Insert a document
 * @param {Object} req express request object
 * @param {Object} res express response object
 * @return {Void} returns nothing
 */
function post (req, res) {
  const {body, collection, method, url} = extractInputs(req);

  console.log('POST:', url);

  mongoDB.collection(collection).insert(body, (err, {ops: [document]}) => {
    if (err) {
      console.log(
        'An error occured while inserting a document into the collection',
        collection,
        'document',
        JSON.stringify(body)
      );
      console.log(err);
      throw new Error(err);
    }

    res.json({
      collection,
      document,
      method
    });
  });
}

/**
 * Replace a document
 * @param {Object} req express request object
 * @param {Object} res express response object
 * @return {Void} returns nothing
 */
function put (req, res) {
  const {body, collection, method, query, url} = extractInputs(req);

  console.log('PUT:', url);

  mongoDB
    .collection(collection)
    .findOneAndReplace(
      query,
      body,
      {returnNewDocument: true},
      (err, {value}) => {
        if (err) {
          console.log(
            'An error occured while querying with the criteria',
            JSON.stringify(query)
          );
          console.log(err);
          throw new Error(err);
        }

        res.json({
          collection,
          document: value,
          method,
          searchCriteria: query
        });
      }
    );
}

const methodTree = {
  DELETE: deleteMethod,
  GET: get,
  PATCH: patch,
  POST: post,
  PUT: put
};

/**
 * Ru
 * @param {Object} req express request object
 * @param {Object} res express response object
 * @param {Function} next express next function
 * @return {Void} returns nothing
 */
function middleware (req, res, next) {
  const method = methodTree[req.method];

  if (method) {
    method(req, res);
    return;
  }

  next();
}

/**
 * Connect to mongo and return the middleware
 * @param {Object} options middleware options
 * @return {Func} returns middleware function
 */
export default function (options) {
  const {url} = options;

  MongoClient.connect(url, (err, db) => {
    if (err) {
      console.log('An error occured while connecting to mongo at', url);
      console.log(err);
      throw new Error(err);
    }

    mongoDB = db;
  });

  return middleware;
}
