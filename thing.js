#!/usr/bin/gjs

imports.gi.versions.Soup = "2.4"; // Soup 1.x is part of the 2.4 namespace
const Soup = imports.gi.Soup;

function installTest() {
    let session = new Soup.SessionSync();
    let message = Soup.Message.new("GET", "https://www.example.com");

    session.send_message(message);

    if (message.status_code === Soup.Status.OK) {
        print("Success:");
        print(message.response_body.data);
    } else {
        print("Failed with status: " + message.status_code);
    }
}

installTest();
