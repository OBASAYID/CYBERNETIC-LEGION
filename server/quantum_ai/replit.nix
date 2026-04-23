{ pkgs }: {
    deps = [
        pkgs.python312
        pkgs.python312Packages.flask
        pkgs.python312Packages.flask-cors
        pkgs.python312Packages.requests
        pkgs.nodejs-18_x
        pkgs.yarn
    ];
}