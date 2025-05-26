const createThread = async (document, res, boardName) => {
  try {
    const data = await document.save();
    res.redirect(`/b/${boardName}?_id=${data._id}`);
  } catch (err) {
    throw err;
  }
}
const showAll = async (board, res) => {
  try {
    const data = await board.find({})
      .sort({bumped_on: -1})
      .limit(10)
      .select('-delete_password -reported -replies.delete_password -replies.reported')
      .exec();
    const result = data.map(thread => {
      const threadObj = thread.toObject();
      if (threadObj.replies && threadObj.replies.length > 3) {
        threadObj.replies = threadObj.replies.slice(-3);
      }
      return threadObj;
    });
    res.json(result);
  } catch (err) {
    res.json([]);
  }
}
const reportThread = async (board, _id, res) => {
  try {
    _id = _id.replace(/\s/g, '');
    const data = await board.findByIdAndUpdate(_id, {reported: true});
    if (data !== null && data !== undefined) {
      res.type('text').send('reported');
    } else {
      res.type('text').send('incorrect board or id');
    }
  } catch (err) {
    res.type('text').send('incorrect board or id');
  }
}
const deleteThread = async (board, _id, password, res) => {
  try {
    _id = _id.replace(/\s/g, '');
    const data = await board.findById(_id);
    if (!data) {
      return res.type('text').send('incorrect board or id');
    }
    if (data.delete_password === password) {
      await board.deleteOne({_id: _id});
      res.type('text').send('success');
    } else {
      res.type('text').send('incorrect password');
    }
  } catch (err) {
    res.type('text').send('incorrect board or id');
  }
}
const createPost = async (board, body, res, boardName) => {
  try {
    const data = await board.findByIdAndUpdate(body.thread_id, 
      {bumped_on: new Date(), 
       $inc: {replycount: 1}, 
       $push: {replies: {text: body.text, created_on: new Date(), delete_password: body.delete_password}}},
      {new: true})
      .select('-reported -delete_password -replies.delete_password -replies.reported')
      .exec();
    if (!data) {
      return res.type('text').send('Thread not found');
    }
    res.redirect('/b/' + boardName + '/' + body.thread_id + '?reply_id=' + data.replies[data.replies.length - 1]._id);
  } catch (err) {
    res.type('text').send(err.message);
  }
}
const showThread = async (board, _id, res) => {
  try {
    _id = _id.replace(/\s/g, '');
    await board.updateMany(
      {}, 
      {"$push": {"replies": {"$each": [], "$sort": {"created_on": -1}}}}
    );
    const data = await board.findById(_id)
      .select('-delete_password -reported -replies.reported -replies.delete_password')
      .exec();
    res.json(data || {});
  } catch (err) {
    res.type('text').send(err.message);
  }
}
const reportPost = async (board, thread_id, post_id, res) => {
  try {
    post_id = post_id.replace(/\s/g, '');
    thread_id = thread_id.replace(/\s/g, '');
    const result = await board.updateOne(
      {_id: thread_id, 'replies._id': post_id}, 
      {'replies.$.reported': true}
    );
    if (result.modifiedCount === 1) {
      res.type('text').send('reported');
    } else {
      res.type('text').send('incorrect board or id');
    }
  } catch (err) {
    res.type('text').send('incorrect board or id');
  }
}
const deletePost = async (board, thread_id, post_id, password, res) => {
  try {
    post_id = post_id.replace(/\s/g, '');
    thread_id = thread_id.replace(/\s/g, '');
    const data = await board.findById(thread_id);
    if (data === null || data === undefined) {
      return res.type('text').send('incorrect board or thread id');
    }
    if (data.replies.some(item => item._id.toString() === post_id)) {
      if (data.replies.id(post_id).delete_password === password) {
        data.replies.id(post_id).text = '[deleted]';
        data.replycount = --data.replycount;
        await data.save();
        res.type('text').send('success');
      } else {
        return res.type('text').send('incorrect password');
      }
    } else {
      return res.type('text').send('incorrect post id');
    }
  } catch (err) {
    throw err;
  }
}
exports.createThread = createThread;
exports.showAll = showAll;
exports.reportThread = reportThread;
exports.deleteThread = deleteThread;
exports.createPost = createPost;
exports.showThread = showThread;
exports.reportPost = reportPost;
exports.deletePost = deletePost;