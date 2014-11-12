;(function(window, undefined){
    "use strict";

    function scrollTo(element, to, duration, callback) {
        var start = element ? element.scrollTop : window.scrollY,
            change = to - start,
            currentTime = 0,
            increment = 20;

        var animateScroll = function() {
            currentTime += increment;
            var val = Math.easeInOutQuad(currentTime, start, change, duration);
            element ? (element.scrollTop = val) : window.scrollTo(0, val);
            if (currentTime <= duration) {
                requestAnimationFrame(animateScroll);
            } else {
                callback && callback();
            }
        };
        requestAnimationFrame(animateScroll);
    }

    //t = current time
    //b = start value
    //c = change in value
    //d = duration
    Math.easeInOutQuad = function(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    };

    var AsyncView = Backbone.View.extend({
        cache: {},
        loadTemplate: function(name){
            if(this.cache[name]){
                var p = $.Deferred();
                p.resolve(this.cache[name]);
                return p;
            }

            var self = this;

            return $.get("./templates/"+name+".html").then(function(html){
                self.cache[name] = html;
                return html;
            });
        }
    })

    var Chat = Backbone.Firebase.Model.extend({
        firebase: new Firebase("https://matthiasak.firebaseio.com/chats"),
        defaults: {
            sender: "anonymous",
            text: "no message given"
        },
        validate: function(attrs){
            var checks = {
                sender: "You forgot a message sender!",
                text: "You forget a message body!"
            }

            var results = _.filter(checks, function(error_message, key){
                return (!attrs[key]);
            })

            if(results.length){
                return results[0];
            }
        }
    });

    var ChatHistory = Backbone.Firebase.Collection.extend({
        model: Chat,
        firebase: new Firebase("https://matthiasak.firebaseio.com/chat").limitToLast(10)
    });

    var MessageView = AsyncView.extend({
        tagName: "li",
        initialize: function(){
            this.render();
        },
        render: function(){
            var self = this;
            this.loadTemplate("message").then(function(html){
                self.el.innerHTML = _.template(html, self.model.attributes);
            })
        }
    })

    var AppView = AsyncView.extend({
        className: "chat",
        initialize: function(options){
            this.options = _.extend({}, {username: "(anonymous)"}, options);
            this.collection = new ChatHistory();
            this.$el.appendTo(document.body);
            this.render();

            this.listenTo(this.collection, "add", function(model, collection, options){
                this.$ul.append(new MessageView({model: model}).el)
                scrollTo(this.el, this.$ul[0].offsetHeight, 250);
            });
        },
        render: function(){
            var self = this;
            this.loadTemplate("chat").then(function(html){
                self.el.innerHTML = _.template(html, {});
                self.input = self.el.querySelector("input");
                self.$ul = $(self.el.querySelector(".messages"));
            })
        },
        events: {
            "submit form": "sendMessage"
        },
        sendMessage: function(event){
            event.preventDefault(); // prevent page from refreshing
            this.collection.create({ sender: this.options.username, text: this.input.value });
            this.input.value = "";
        }
    });

    var ChatRouter = Backbone.Router.extend({
        initialize: function(){
            this.appView = new AppView({
                username: prompt("What is your name?")
            });
            Backbone.history.start();
        },
        routes: {
            "*actions": "defaultRoute" // matches anything not matched before this, i.e. http://example.com/#anything-here
        },
        defaultRoute: function(){}
    });

    window.BaasChat = {
        router: ChatRouter
    }

})(window, undefined)