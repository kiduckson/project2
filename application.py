import os
import requests

from datetime import timedelta
from flask import Flask, jsonify, render_template, request, session, redirect
from flask_session import Session
from flask_socketio import SocketIO, emit, join_room, leave_room


app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

usernames = []  # List to store current users
channels = []  # List of channels and respective messages


@app.route("/")
def index():
    return render_template("index.html")


# UPON CONNECTION
@socketio.on("client_side_emit_ONLINE")
def online():
    # RENDER CURRENT USER LIST BEFORE LOGIN
    emit("server_side_emit_USERLIST", usernames, broadcast=True)
    # RENDER LOGINFORM
    emit("server_side_emit_LOGINFORM")

# LOGIN
@socketio.on("client_side_emit_LOGIN")
def login(data):
    username = data['username']

    # EXTRACT CHANNEL LIST
    names = []
    for channel in channels:
        names.append(channel['channelName'])

    # CHECK DUPLICATE
    if data['re_login'] == False:
        if username in usernames:
            emit("server_side_emit_ERROR", {
                'message': "The given name is already used"})
        else:
            # ADD USER
            usernames.append(username)
            session["username"] = username

            # RENDER USER ADDITION
            emit("server_side_emit_ADDUSER", {
                "username": username}, broadcast=True)
            # RENDER CHANNEL LIST
            emit("server_side_emit_CHANNEL_LIST", names, broadcast=True)
            # RENDER BUTTONS
            emit("server_side_emit_BUTTONS", broadcast=True)
    else:
        # ADD USER
        session["username"] = username

        # RENDER USER LIST
        emit("server_side_emit_USERLIST", usernames, broadcast=True)
        # RENDER CHANNEL LIST
        emit("server_side_emit_CHANNEL_LIST", names, broadcast=True)
        # RENDER BUTTONS
        emit("server_side_emit_BUTTONS", broadcast=True)


# CREATE_CHANNEL
@socketio.on("client_side_emit_CREATE_CHANNEL")
def create_channel(data):
    # GET DATA FROM CLIENT AND INITIALIZE THE DATA ENTRY
    channelName = data['channelName']
    channelTime = data['channelTime']
    data['message'] = []

    # CHECK FOR DUPLICATE
    names = []
    for channel in channels:
        names.append(channel['channelName'])

    if channelName in names:
        emit("server_side_emit_ERROR", {
            'message': "The given channel name is already in use"
        })
    else:
        # INSERT
        channels.append(data)
        session['channelName'] = channelName

        # CHANNEL LIST
        names = []
        for channel in channels:
            names.append(channel['channelName'])

        # RE-RENDER CHANNEL LIST
        emit("server_side_emit_CHANNEL_LIST", names, broadcast=True)

        # RENDER THE CHANNEL ROOM
        emit("server_side_emit_RENDER_ROOM", {"channelName": channelName,
                                              "channelTime": channelTime}, broadcast=False)


@socketio.on("client_side_emit_SEND_MESSAGE")
def send_message(data):
    # CHECK WHETHER SESSION AND LOCALSTORAGE MATCH
    username = session.get('username')

    # CHANNEL NAME
    channelName = data['channelName']

    # MSG CONTENTS
    msg_contents = data['msg_contents']

    # MSG TIME
    msg_time = data['msg_time']

    # MAKE A DICT
    message = {'msg_sender': username, "msg_contents": msg_contents,
               "msg_time": msg_time}

    # ADD MESSAGE TO SERVER
    for i in range(len(channels)):
        if channels[i]['channelName'] == channelName:
            ch = channels[i]['message']
            ch.append(message)
            # DELETE THE OLDEST IF THE MSG REACHED 100 THRESHOLD
            if len(ch) == 100:
                ch.pop(0)

    # EMIT TO ADD A NEW MESSAGE
    emit("server_side_emit_ADD_NEW_MESSAGE", message, broadcast=True)


# CHANGE CHANNEL
@socketio.on("client_side_emit_CHANGE_CHANNEL")
def change_channel(data):

    # CHANNEL DESTINATION
    channelName = data['channelName']

    # USER WHO MADE THE REQUEST
    username = data['username']

    # GET ALL THE PREVIOUS MESSAGES
    for i in range(len(channels)):
        if channels[i]["channelName"] == channelName:
            messages = channels[i]['message']
            emit("server_side_emit_RENDER_ROOM", {
                "channelName": channelName,
                "channelTime": channels[i]['channelTime']}, broadcast=True)

            emit("server_side_emit_ALL_MESSAGES", {
                 'messages': messages, 'username': username}, broadcast=True)


# LOG OUT
@socketio.on("client_side_emit_LOGOUT")
def logout():
    # GET THE USER NAME FROM THE SESSION
    username = session.get('username')
    # REMOVE FROM THE LIST
    if username in usernames:
        usernames.remove(username)
    else:
        print("not in the list")
    # CLEAR THE SESSION
    session.clear()
    # CLEAR THE NAME TAG
    emit("server_side_emit_USERNAME_RENDER", {'username': " "})

# NAME TAG
@socketio.on("client_side_emit_USERNAME")
def username_display(data):
    # USERNAME
    session['username'] = data['username']
    emit("server_side_emit_USERNAME_RENDER", {'username': data['username']})
