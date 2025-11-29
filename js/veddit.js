  // --- Global State ---
  let currentUser = null;
  let cachedQuestions = []; 
  let currentThreadId = null; // ID of the Question
  let activeUnsubscribe = null;
  
  // Threading logic
  let allRepliesFlat = []; // Store raw replies to filter for focus mode
  let replyParentId = null; // For composing new reply
  let focusedCommentId = null; // If set, we only show this comment tree

  // --- Auth & Init ---
  auth.onAuthStateChanged(async user => {
    if(user){
      const doc = await db.collection('users').doc(user.uid).get();
      const data = doc.exists ? doc.data() : {};
      currentUser = {
        uid: user.uid, email: user.email,
        username: data.username || user.email.split('@')[0], role: data.role || 'student'
      };
      document.getElementById('authStatus').innerHTML = `<span style="font-weight:600">${currentUser.username}</span> <span class="badge badge-${currentUser.role === 'operator' ? 'op' : 'student'}">${currentUser.role}</span>`;
      document.getElementById('authLinks').classList.add('hidden');
      document.getElementById('signOutBtn').classList.remove('hidden');
    } else {
      currentUser = null;
      document.getElementById('authStatus').innerText = 'Guest Mode';
      document.getElementById('authLinks').classList.remove('hidden');
      document.getElementById('signOutBtn').classList.add('hidden');
    }
    renderFeedItems(cachedQuestions);
  });
  document.getElementById('signOutBtn').onclick = () => auth.signOut();

  // --- Posting ---
  function togglePostCreator(show){
    if(show){ postMin.classList.add('hidden'); postCard.classList.remove('hidden'); }
    else { postCard.classList.add('hidden'); postMin.classList.remove('hidden'); }
  }

  document.getElementById('postBtn').onclick = async () => {
    if(!currentUser) return alert("Sign in first.");
    const title = document.getElementById('qTitle').value.trim();
    const body = document.getElementById('qBody').value.trim();
    const tag = document.getElementById('qTag').value.trim() || 'General';
    const anon = document.getElementById('qAnon').checked;
    
    if(!title && !body) return;
    document.getElementById('postStatus').innerText = "Publishing...";

    try {
      await db.collection('questions').add({
        title, body, tag, anon,
        authorUid: currentUser.uid,
        authorName: anon ? 'Anonymous' : currentUser.username,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        likes: 0, dislikes: 0
      });
      document.getElementById('postStatus').innerText = "Success!";
      setTimeout(() => togglePostCreator(false), 800);
    } catch(e) { alert(e.message); }
  };

  // --- Feed ---
  db.collection('questions').orderBy('createdAt', 'desc').limit(50).onSnapshot(snapshot => {
    cachedQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderFeedItems(cachedQuestions);
  });

  function renderFeedItems(questions){
    const list = document.getElementById('feedList');
    list.innerHTML = '';
    questions.forEach(q => {
      const el = document.createElement('div');
      el.className = 'card question';
      const time = q.createdAt ? q.createdAt.toDate().toLocaleDateString() : 'Just now';
      const isOp = currentUser && currentUser.role === 'operator';
      
      el.innerHTML = `
        <div class="row space-between">
          <span class="badge badge-student" style="font-size:11px">${q.tag}</span>
          <span class="small">${time}</span>
        </div>
        <h3 style="margin:8px 0 4px 0">${escapeHtml(q.title)}</h3>
        <div class="small" style="margin-bottom:8px">by ${escapeHtml(q.authorName)}</div>
        <div style="color:#374151; line-height:1.5; font-size:14px;">${escapeHtml(q.body)}</div>
        <div class="row space-between" style="margin-top:12px;">
           <div class="votes">
             <span class="vote-arrow" id="up-${q.id}">⬆</span> <span style="font-size:13px;font-weight:bold;margin:0 4px">${(q.likes||0) - (q.dislikes||0)}</span> <span class="vote-arrow" id="down-${q.id}">⬇</span>
           </div>
           <button class="ghost small" id="reply-${q.id}">💬 Comments</button>
        </div>
        ${isOp ? `<div style="text-align:right; margin-top:5px;"><button class="small danger" id="del-${q.id}">Delete</button></div>` : ''}
      `;
      list.appendChild(el);
      document.getElementById(`up-${q.id}`).onclick = () => vote(q.id, 'questions', 1);
      document.getElementById(`down-${q.id}`).onclick = () => vote(q.id, 'questions', -1);
      document.getElementById(`reply-${q.id}`).onclick = () => openThread(q.id, q);
      if(isOp) document.getElementById(`del-${q.id}`).onclick = () => deletePost(q.id);
    });
  }

  // --- Threading System (Robust DOM Version) ---

  function openThread(qid, qData){
    currentThreadId = qid;
    focusedCommentId = null;
    allRepliesFlat = [];
    
    // UI Reset
    document.getElementById('replyModal').classList.remove('hidden');
    document.getElementById('focusBar').style.display = 'none';
    document.getElementById('threadContext').style.display = 'block';
    document.getElementById('focusedParentContext').style.display = 'none';
    cancelReplyTarget(); 

    // Render Main Post Context
    document.getElementById('threadContext').innerHTML = `
      <h3 style="margin:0 0 10px 0">${escapeHtml(qData.title)}</h3>
      <p style="font-size:14px; line-height:1.5;">${escapeHtml(qData.body)}</p>
      <div class="small" style="margin-top:10px;color:#888">Posted by ${escapeHtml(qData.authorName)}</div>
    `;

    // Listen for replies
    if(activeUnsubscribe) activeUnsubscribe();
    
    // Fetch all replies for this post
    activeUnsubscribe = db.collection('questions').doc(qid).collection('replies')
      .orderBy('createdAt', 'asc')
      .onSnapshot(snap => {
        allRepliesFlat = snap.docs.map(d => ({id: d.id, ...d.data()}));
        refreshThreadView();
      });
  }

  function refreshThreadView() {
      const container = document.getElementById('repliesContainer');
      container.innerHTML = ''; // Clear previous
      
      let itemsToRender = allRepliesFlat;
      
      // 1. Handle Focus Mode (Deep threads)
      if (focusedCommentId) {
          const focusedComment = allRepliesFlat.find(r => r.id === focusedCommentId);
          if (focusedComment) {
              const ctx = document.getElementById('focusedParentContext');
              ctx.style.display = 'block';
              ctx.innerHTML = `
                  <div class="small" style="margin-bottom:5px; font-weight:bold;">Viewing single thread:</div>
                  <div style="background:#fff; padding:8px; border-radius:4px;">${escapeHtml(focusedComment.text)}</div>
              `;
              
              document.getElementById('focusBar').style.display = 'flex';
              document.getElementById('threadContext').style.display = 'none';
              
              // Only get descendants
              itemsToRender = getAllDescendants(focusedCommentId, allRepliesFlat);
          }
      } else {
          document.getElementById('focusBar').style.display = 'none';
          document.getElementById('threadContext').style.display = 'block';
          document.getElementById('focusedParentContext').style.display = 'none';
      }

      // 2. Build Tree
      const tree = buildTree(itemsToRender, focusedCommentId); 

      // 3. Render Tree to DOM
      if(tree.length === 0 && !focusedCommentId) {
          container.innerHTML = '<div style="padding:20px; text-align:center; color:#999">No comments yet.</div>';
      } else {
          tree.forEach(node => {
              container.appendChild(createReplyNode(node, 0));
          });
      }
  }

  function buildTree(items, rootId = null) {
      const rootItems = [];
      const lookup = {};
      
      // Initialize lookup
      items.forEach(item => lookup[item.id] = { ...item, children: [] });
      
      // Connect nodes
      items.forEach(item => {
          // If item has a parent AND that parent is in the current set of items
          if (item.parentId && lookup[item.parentId]) {
              lookup[item.parentId].children.push(lookup[item.id]);
          } else {
              // Otherwise treat as root (handles top-level OR orphans)
              rootItems.push(lookup[item.id]);
          }
      });
      return rootItems;
  }

  function getAllDescendants(rootId, allItems) {
      let descendants = [];
      let children = allItems.filter(i => i.parentId === rootId);
      descendants = [...descendants, ...children];
      children.forEach(child => {
          descendants = [...descendants, ...getAllDescendants(child.id, allItems)];
      });
      return descendants;
  }

  // --- Core Rendering Function (Direct DOM Creation) ---
  function createReplyNode(node, depth){
      // 1. Create Wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'reply-node';
      
      // 2. Logic: Max Depth Limit
      if (depth >= 4 && node.children.length > 0) {
          wrapper.innerHTML = `
            <div class="reply-content" style="padding:8px; background:#fff;">
                <div class="reply-header"><b>${escapeHtml(node.authorName)}</b></div>
                <div class="reply-body">${escapeHtml(node.text)}</div>
            </div>
          `;
          const contBtn = document.createElement('div');
          contBtn.className = 'continue-thread';
          contBtn.innerText = '➜ Continue this thread';
          contBtn.style.marginLeft = '12px';
          contBtn.onclick = () => focusOnThread(node.id);
          wrapper.appendChild(contBtn);
          return wrapper;
      }

      // 3. Create Content Div
      const content = document.createElement('div');
      content.className = 'reply-content';
      
      const timeStr = node.createdAt ? node.createdAt.toDate().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '...';
      const isOp = currentUser && currentUser.role === 'operator';
      const score = (node.likes||0) - (node.dislikes||0);

      // Header
      const header = document.createElement('div');
      header.className = 'reply-header';
      header.innerHTML = `<b>${escapeHtml(node.authorName)}</b> <span>• ${timeStr}</span>`;
      content.appendChild(header);

      // Body
      const body = document.createElement('div');
      body.className = 'reply-body';
      body.innerText = node.text; // Using innerText handles safety automatically
      content.appendChild(body);

      // Actions Row
      const actions = document.createElement('div');
      actions.className = 'reply-actions';
      
      // Vote Up
      const up = document.createElement('span');
      up.className = 'action-link';
      up.innerText = `⬆ ${score}`;
      up.onclick = () => voteReply(node.id, 1);
      
      // Vote Down
      const down = document.createElement('span'); // Optional visual
      // Reply Btn
      const rep = document.createElement('span');
      rep.className = 'action-link';
      rep.innerText = 'Reply';
      rep.onclick = () => setReplyTarget(node.id, node.authorName);

      actions.append(up, rep);

      if (isOp) {
          const del = document.createElement('span');
          del.className = 'action-link';
          del.style.color = 'red';
          del.innerText = 'Delete';
          del.onclick = () => deleteReply(node.id);
          actions.appendChild(del);
      }
      
      content.appendChild(actions);
      wrapper.appendChild(content);

      // 4. Create Children Container
      const childContainer = document.createElement('div');
      childContainer.className = 'thread-children';
      
      if(node.children && node.children.length > 0){
          node.children.forEach(child => {
              childContainer.appendChild(createReplyNode(child, depth + 1));
          });
      } else {
          childContainer.style.display = 'none';
      }
      
      wrapper.appendChild(childContainer);
      return wrapper;
  }

  // --- Interaction Logic ---
  
  window.focusOnThread = function(commentId) {
      focusedCommentId = commentId;
      refreshThreadView();
      document.querySelector('.modal .card').scrollTop = 0; // Fix scroll
  }

  window.resetToFullThread = function() {
      focusedCommentId = null;
      refreshThreadView();
  }

  function setReplyTarget(parentId, name){
      replyParentId = parentId;
      document.getElementById('replyTargetName').innerText = name;
      document.getElementById('replyingToIndicator').style.display = 'inline-block';
      document.getElementById('replyInput').focus();
  }

  window.cancelReplyTarget = function(){
      replyParentId = null;
      document.getElementById('replyingToIndicator').style.display = 'none';
  };

  document.getElementById('sendReplyBtn').onclick = async () => {
    if(!currentUser) return alert("Sign in to reply.");
    const text = document.getElementById('replyInput').value.trim();
    const anon = document.getElementById('replyAnon').checked;
    
    if(!text) return;
    
    document.getElementById('sendReplyBtn').innerText = "...";
    
    try {
        await db.collection('questions').doc(currentThreadId).collection('replies').add({
          text, anon,
          authorUid: currentUser.uid,
          authorName: anon ? 'Anonymous' : currentUser.username,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          likes: 0, dislikes: 0,
          parentId: replyParentId
        });
        document.getElementById('replyInput').value = "";
        cancelReplyTarget();
    } catch(e) {
        alert("Error: " + e.message);
    }
    document.getElementById('sendReplyBtn').innerText = "Send Reply";
  };

  function closeThread(){
    document.getElementById('replyModal').classList.add('hidden');
    if(activeUnsubscribe) activeUnsubscribe();
    currentThreadId = null;
  }
  // --- Voting Utils ---
  async function vote(docId, col, val){
     if(!currentUser) return alert("Sign in");
     const ref = db.collection(col).doc(docId);
     const vRef = ref.collection('votes').doc(currentUser.uid);
     db.runTransaction(async t => {
       const doc = await t.get(ref);
       const vDoc = await t.get(vRef);
       if(!doc.exists) return;
       let l=doc.data().likes||0, d=doc.data().dislikes||0;
       if(vDoc.exists){
         if(vDoc.data().value===val){ t.delete(vRef); val===1?l--:d--; }
         else{ t.update(vRef,{value:val}); if(val===1){l++;d--}else{l--;d++} }
       } else { t.set(vRef,{value:val}); val===1?l++:d++; }
       t.update(ref,{likes:l,dislikes:d});
     });
  }

  async function voteReply(rid, val){
     // Simplified vote for nested reply (same logic)
     if(!currentUser) return alert("Sign in");
     const ref = db.collection('questions').doc(currentThreadId).collection('replies').doc(rid);
     const vRef = ref.collection('votes').doc(currentUser.uid);
     db.runTransaction(async t => {
       const doc = await t.get(ref);
       const vDoc = await t.get(vRef);
       if(!doc.exists) return;
       let l=doc.data().likes||0, d=doc.data().dislikes||0;
       if(vDoc.exists){
         if(vDoc.data().value===val){ t.delete(vRef); val===1?l--:d--; }
         else{ t.update(vRef,{value:val}); if(val===1){l++;d--}else{l--;d++} }
       } else { t.set(vRef,{value:val}); val===1?l++:d++; }
       t.update(ref,{likes:l,dislikes:d});
     });
  }

  async function deletePost(id){ if(confirm("Delete post?")) await db.collection('questions').doc(id).delete(); }
  async function deleteReply(rid){ if(confirm("Delete reply?")) await db.collection('questions').doc(currentThreadId).collection('replies').doc(rid).delete(); }
  function escapeHtml(t) { return t ? t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") : ''; }