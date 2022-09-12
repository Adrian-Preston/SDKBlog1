"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mendixmodelsdk_1 = require("mendixmodelsdk");
const mendixplatformsdk_1 = require("mendixplatformsdk");
const fs = require("fs");
// Usage: node showdocument.js nickname documentname appID branch
//   nickname is your own name for the app
//   documentname if the qualified name (module.document) of the document to serialize
//   appID is the appID for the app (taken from the Mendix developer portal page)
//   branch is the name of the branch to use
//
// The appID and branch are only needed when setting up a new working copy
//
// The appID, branch name and working copy ID are saved in a file called nickname.workingcopy in the
// current folder so they can be used next time if possible
//
const args = process.argv.slice(2);
main(args);
async function main(args) {
    var appID = "";
    var branch = "";
    var documentname = "";
    if (args.length < 1) {
        console.log(`Need at least a nickname and document name on the command line`);
        return;
    }
    const nickname = args[0].split(' ').join('');
    documentname = args[1];
    if (args.length > 2)
        appID = args[2];
    if (args.length > 3)
        branch = args[3];
    const workingCopyFile = nickname + '.workingcopy';
    var wcFile;
    var wcID;
    try {
        wcFile = fs.readFileSync(workingCopyFile).toString();
        appID = wcFile.split(':')[0];
        branch = wcFile.split(':')[1];
        wcID = wcFile.split(':')[2];
    }
    catch {
        wcFile = "";
        wcID = "";
        if (appID === "") {
            console.log("Need an appID on the command line if no workingcopy file is present for the nickname");
            return;
        }
    }
    const client = new mendixplatformsdk_1.MendixPlatformClient();
    var workingCopy;
    const app = client.getApp(appID);
    var useBranch = branch;
    if (wcID != "") {
        try {
            console.log("Opening existing working copy");
            workingCopy = app.getOnlineWorkingCopy(wcID);
        }
        catch (e) {
            console.log(`Failed to get existing working copy ${wcID}: ${e}`);
            wcID = "";
        }
    }
    if (wcID === "") {
        const repository = app.getRepository();
        if ((branch === "") || (branch === "trunk") || (branch === "main")) {
            const repositoryInfo = await repository.getInfo();
            if (repositoryInfo.type === "svn")
                useBranch = "trunk";
            else
                useBranch = "main";
        }
        try {
            workingCopy = await app.createTemporaryWorkingCopy(useBranch);
            wcID = workingCopy.workingCopyId;
        }
        catch (e) {
            console.log(`Failed to create new working copy for app ${appID}, branch ${useBranch}: ${e}`);
            return;
        }
    }
    fs.writeFileSync(workingCopyFile, `${appID}:${useBranch}:${wcID}`);
    const model = await workingCopy.openModel();
    console.log(`Opening ${documentname}`);
    if (documentname.split(".").length <= 1) {
        const domainmodelinterfaces = model.allDomainModels().filter(dm => dm.containerAsModule.name === documentname);
        if (domainmodelinterfaces.length < 1)
            console.log(`Cannot find domain model for ${document}`);
        else {
            try {
                const domainmodelinterface = domainmodelinterfaces[0];
                const domainmodel = await domainmodelinterface.load();
                console.log(mendixmodelsdk_1.JavaScriptSerializer.serializeToJs(domainmodel));
            }
            catch (e) {
                console.log(`Error occured: ${e}`);
            }
        }
    }
    else {
        const documentinterfaces = model.allDocuments().filter(doc => doc.qualifiedName === documentname);
        if (documentinterfaces.length < 1)
            console.log(`Cannot find document for ${document}`);
        else {
            try {
                const documentinterface = documentinterfaces[0];
                const document = await documentinterface.load();
                console.log(mendixmodelsdk_1.JavaScriptSerializer.serializeToJs(document));
            }
            catch (e) {
                console.log(`Error occured: ${e}`);
            }
        }
    }
}
