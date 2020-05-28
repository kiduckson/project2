document.addEventListener("DOMContentLoaded", () => {
  // place to draw
  const userlist_placement = document.querySelector("#userlist_placement");
  const username_placement = document.querySelector("#username_placement");
  const buttons_placement = document.querySelector("#buttons_placement");
  const error_message_placement = document.querySelector(
    "#error_message_placement"
  );
  const channel_list_placement = document.querySelector(
    "#channel_list_placement"
  );
  const channel_view_placement = document.querySelector(
    "#channel_view_placement"
  );
  const login_form_placement = document.querySelector("#login_form_placement");

  // things to draw
  const username_handlebar = Handlebars.compile(
    document.querySelector("#username_handlebar").innerHTML
  );
  const login_form_handlebar = Handlebars.compile(
    document.querySelector("#login_form_handlebar").innerHTML
  );
  const error_handlebar = Handlebars.compile(
    document.querySelector("#error_handlebar").innerHTML
  );
  const name_tag_handlebar = Handlebars.compile(
    document.querySelector("#name_tag_handlebar").innerHTML
  );
  const name_tag_template_for_single_handlebar = Handlebars.compile(
    document.querySelector("#name_tag_template_for_single_handlebar").innerHTML
  );
  const channel_view_handlebar = Handlebars.compile(
    document.querySelector("#channel_view_handlebar").innerHTML
  );
  const channel_list_template_handlebar = Handlebars.compile(
    document.querySelector("#channel_list_template_handlebar").innerHTML
  );
  const channel_messages_handlebar = Handlebars.compile(
    document.querySelector("#channel_messages_handlebar").innerHTML
  );
  const button_handlebar = Handlebars.compile(
    document.querySelector("#button_handlebar").innerHTML
  );

  // Connect to websocket
  var socket = io.connect(
    location.protocol + "//" + document.domain + ":" + location.port
  );

  let re_login = false;

  // INITIALIZE
  socket.on("connect", () => {
    // CHECK IF THE USER HAS ALREADY HAD LOGGED IN ALREADY
    if (localStorage.getItem("username")) {
      // IF LOGGED IN GET THE USERNAME FROM THE LOCAL STORAGE
      const username = localStorage.getItem("username");
      // SET THE RE_LOGIN FLAG TO TRUE
      re_login = true;

      // EMIT TO DRAW THE PREVIOUSLY VISITED CHANNEL
      socket.emit("client_side_emit_USERNAME", { username: username });
      socket.emit("client_side_emit_LOGIN", {
        username: username,
        re_login: re_login,
      });
      socket.emit("client_side_emit_CHANGE_CHANNEL", {
        channelName: localStorage.getItem("channelName"),
        username: username,
      });
      // FIRST VISIT
    } else {
      socket.emit("client_side_emit_ONLINE");
    }
  });

  // NAME_TAG SHOWS WHO IS NOW LOGGED IN
  socket.on("server_side_emit_USERNAME_RENDER", ({ username }) => {
    // IF NOT EMPTY
    if (username !== " ") {
      username_placement.innerHTML = username_handlebar({ username: username });
    }
  });

  // USERLIST
  socket.on("server_side_emit_USERLIST", (usernames) => {
    // ERASE THE PREVIOUSLY ADDED USERLIST
    userlist_placement.innerHTML = "";
    // RE_DRAW WITH UPDATED ONE
    userlist_placement.innerHTML = name_tag_handlebar({ usernames: usernames });
  });

  // LOGIN
  socket.on("server_side_emit_LOGINFORM", () => {
    // DRAW LOGIN FORM
    login_form_placement.innerHTML = login_form_handlebar();

    // ADD EVENT LISTNER
    document.querySelector("#login_form").addEventListener("submit", (e) => {
      e.preventDefault();

      // TRIM UNNECESSARY WHITE SPACE
      const username = document.querySelector("#username").value.trim();

      // SAVE TO LOCALSTORAGE
      localStorage.setItem("username", username);

      // RELOGIN FLAG TO FALSE
      re_login = false;

      // EMIT TO THE SERVER
      socket.emit("client_side_emit_LOGIN", {
        username: username,
        re_login: re_login,
      });
      // EMIT FOR THE NAME TAG
      socket.emit("client_side_emit_USERNAME", { username: username });
    });
  });

  // ERROR MESSAGE
  socket.on("server_side_emit_ERROR", ({ message }) => {
    error_message_placement.innerHTML = error_handlebar({ message: message });
  });

  // ADD A USER TO THE LIST
  socket.on("server_side_emit_ADDUSER", ({ username }) => {
    // CREATE DIV NOTE FOR APPEND
    const div = document.createElement("div");
    div.className = "toast";
    div.innerHTML = name_tag_template_for_single_handlebar({
      username: username,
    });
    // APPEND
    userlist_placement.appendChild(div);
  });

  // RENDER BUTTON
  socket.on("server_side_emit_BUTTONS", () => {
    buttons_placement.innerHTML = button_handlebar();

    // ON SUBMIT EVENT
    document.querySelector("#channel_form").onsubmit = (e) => {
      e.preventDefault();

      // GET THE CHANNEL NAME
      const input = document.querySelector("#channel_name");

      // TRIM WHITESPACES
      const channelName = input.value.trim();

      // MSG SENT TIME USING MOMENT JS
      const channelTime = moment();

      // EMPTY THE INPUT FIELD
      input.value = "";

      // SAVE THE CHANNEL NAME
      localStorage.setItem("channelName", channelName);

      // EMIT TO THE SERVER
      socket.emit("client_side_emit_CREATE_CHANNEL", {
        channelName: channelName,
        channelTime: channelTime,
      });

      // HIDE MODAL
      $("#create_channel_modal").modal("hide");
    };

    //LOG OUT
    document.querySelector("#logout").onclick = () => {
      // ERASE THE DOM
      channel_list_placement.innerHTML = "";
      buttons_placement.innerHTML = "";
      channel_view_placement.innerHTML = "";
      userlist_placement.innerHTML = "";
      username_placement.innerHTML = "";

      /// CLEAR THE LOCALSTORAGE
      localStorage.clear();

      // RENDER LOGIN FORM
      login_form_placement.innerHTML = login_form_handlebar();

      // EMIT TO THE SERVER
      socket.emit("client_side_emit_LOGOUT");
      socket.emit("client_side_emit_ONLINE");
    };
  });

  // CHANNEL LIST
  socket.on("server_side_emit_CHANNEL_LIST", (names) => {
    // ERASE LOGIN FORM
    login_form_placement.innerHTML = "";
    // RENDER
    channel_list_placement.innerHTML = channel_list_template_handlebar({
      names: names,
    });

    // ADD EVENT LISTENER
    document.querySelectorAll("#each_channel").forEach((button) => {
      button.addEventListener("click", () => {
        // NAME FROM DATA-RM ATTRIBUTE
        channelName = button.dataset.rm;
        // SAVE THE CHANGE INTO THE LOCALSTORAGE
        localStorage.setItem("channelName", channelName);

        // GET THE USERNAME TO DISTINGUISH THE MESSAGES
        username = localStorage.getItem("username");

        // LOOP THROUGH SIBILING NODES AND DEACTIVE THEM ALL
        button.parentElement.childNodes.forEach((node) => {
          node.classList = "list-group-item list-group-item-action";
        });
        // ACTIVE SELECTED BUTTONG
        button.classList = "list-group-item list-group-item-action active";

        //EMIT
        socket.emit("client_side_emit_CHANGE_CHANNEL", {
          channelName: channelName,
          username: username,
        });
      });
    });
  });

  //RENDER ROOM
  socket.on("server_side_emit_RENDER_ROOM", ({ channelName, channelTime }) => {
    // DRAW FROM THE HANDLEBAR TEMPLATE
    channel_view_placement.innerHTML = channel_view_handlebar({
      channelName: channelName,
      channelTime: moment(channelTime).format("MMMM Do YYYY, h:mm:ss a"),
    });
    // ADD EVENT LISTEN TO THE BUTTON
    document.querySelector("#msg_form").addEventListener("submit", (e) => {
      e.preventDefault();

      // SELECT THE INPUT FIELD
      const msg = document.querySelector("#msg_contents");

      // REMOVE WHITESPACES
      const msg_contents = msg.value.trim();

      // EMPTY THE INPUT FIELD
      msg.value = "";

      // MSG_TIME
      const msg_time = moment();

      // EMIT THE MSG TO SERVER TO STORE
      socket.emit("client_side_emit_SEND_MESSAGE", {
        channelName: channelName,
        msg_contents: msg_contents,
        msg_time: msg_time,
      });
    });
  });

  socket.on(
    // GET THE MSG AFTER STORE
    "server_side_emit_ADD_NEW_MESSAGE",
    ({ msg_sender, msg_contents, msg_time }) => {
      // COMPARE WITH THE LOCALSTORAGE
      const username = localStorage.getItem("username");
      // IF THE MSG IS NOT SENT BY THE USER RENDER AS OTHER'S MSG
      const className =
        username == msg_sender
          ? "my_msg ml-auto mb-2"
          : "others_msg mr-auto mb-2";

      // DRAW THE MSG
      const contents = newMessage(
        msg_sender,
        msg_contents,
        moment(msg_time).format("MMMM Do YYYY, h:mm:ss a"),
        className
      );

      // CREATE DIV NODE TO INSERTBEFORE ** HANDLEBAR TEMP RETURNS STRING
      const div = document.createElement("div");
      const msg = document.querySelector("#msg");
      div.innerHTML = contents;

      // IF THERE IS NO MSG, ADD IT AS THE FIRST
      if (!msg.childNodes[0]) msg.appendChild(div);
      //OTHER WISE INSERTBEFORE THAT THE LATEST MSG CAN POP AT THE TOP
      else document.querySelector("#msg").insertBefore(div, msg.childNodes[0]);
    }
  );

  // RENDER ALL THE MSG IN THE SERVER
  socket.on("server_side_emit_ALL_MESSAGES", ({ messages, username }) => {
    // EMPTY THE DOM
    document.querySelector("#msg").innerHTML = "";

    // FOR LOOP MSGS
    messages.forEach(({ msg_sender, msg_contents, msg_time }) => {
      // CHECK WHO THE SENDER ARE AND RENDER ACCORDINLGY
      const className =
        username == msg_sender
          ? "my_msg ml-auto mb-2"
          : "others_msg mr-auto mb-2";

      // DRAW USING SEPERATE FUNC
      const contents = newMessage(
        msg_sender,
        msg_contents,
        moment(msg_time).format("MMMM Do YYYY, h:mm:ss a"),
        className
      );

      // CREATE NODE
      const div = document.createElement("div");
      const msg = document.querySelector("#msg");
      div.innerHTML = contents;

      // APPEND ACCORDINGLY
      if (!msg.childNodes[0]) msg.appendChild(div);
      else document.querySelector("#msg").insertBefore(div, msg.childNodes[0]);
    });
  });

  // SEPERATE FUCNCTION FOR DRAW MSGS
  function newMessage(msg_sender, msg_contents, msg_time, className) {
    return channel_messages_handlebar({
      msg_sender: msg_sender,
      msg_contents: msg_contents,
      msg_time: msg_time,
      className: className,
    });
  }
});
