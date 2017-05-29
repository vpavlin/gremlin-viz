$(document).ready(function() {
    var timeouts ={}
    var settings_o = {}
    var last_loaded = 0

    if (localStorage["settings"] !== undefined) {
        settings_o = JSON.parse(localStorage["settings"])
    }

    var lc = localStorage["gremlin-query"]
    if (lc == undefined || lc.length == 0) {
        lc = []
    } else {
        lc = JSON.parse(lc)
    }

    $("#settings_button").click(settings)
    $("#save_settings").click(saveSettings)
    $("#history_next").click(loadMoreHistory)
    var client = gremlin.createClient(settings_o.port, settings_o.host)
    $("#send").click(query)
    loadHistory()

    function updateStatus(msg) {
        console.log(msg)
        $("#status").text(msg)
    }

    function store() {
        localStorage["gremlin-query"] = JSON.stringify(lc)
    }

    function paste() {
        $("#query").val($(this).html().replace(/<br>/gi, "\n"))
    }

    function deleteItem(e) {
        e.preventDefault()
        var id = $(this).parent().attr("id")
        console.log("Will delete "+id)
        var history = $(this).parent().parent()
        timeouts[id]=setTimeout(function() {
            $("#"+id).slideToggle(500, function() {
                delete lc[id]
                store()
                loadHistory()
            })
        }.bind(this), 3000)
        $(this).unbind("click", deleteItem)
        $(this).text("Undo").click(function(e) {
            undoDelete(e, this)
        })
    }

    function undoDelete(e, elem) {
        e.preventDefault()
        var id = $(elem).parent().attr("id")
        clearTimeout(timeouts[id])
        delete timeouts[id]
        console.log("Clearing delete request for "+id)
        $(elem).unbind("click", undoDelete)
        $(elem).click(deleteItem).text("x")
    }

    function loadHistory(from, num) {
        console.log(from)
        if (from === undefined) {
            from = 0
        }
        if (num === undefined) {
            num = 10
        }
        if (from == 0) {
            $("#history").html("")
        }
        var loaded_num = 0 
        for (var i=from; i<lc.length && loaded_num<num; i++) {
            var real_id = lc.length-1-i
            var code = $("<code></code>")
            if (lc[real_id] === null || lc[real_id] === undefined) {
                continue
            }
            $(code).html(lc[real_id].replace(/\n/gi, "<br />"))
            $(code).click(paste)
            var del_str = "x"
            var del = $("<a></a>")
            if (timeouts[real_id] !== undefined) {
                del_str = "Undo"
                $(del).click(function(e) {
                    undoDelete(e, del)
                }).text(del_str) 
            } else {
                $(del).click(deleteItem).text(del_str)
            }
            var div = $("<div></div>").append(del).append(code)
            $(div).attr("id", real_id)
            $("#history").append(div)
            loaded_num++
            last_loaded = i
            console.log(i)
        }
    }

    function settings(e) {
        e.preventDefault()
        var width = parseInt($("#settings").css("width"))
        var doc_width = $(document).width()
        $("#settings").css("left", parseInt(doc_width/2-width/2)+"px")

        if (settings_o !== undefined) {
            if (settings_o.host) { $("#settings input[name='host']").val(settings_o.host) }
            if (settings_o.port) { $("#settings input[name='port']").val(settings_o.port) }
        }
        $("#settings").show()
    }
    function saveSettings(e) {
        e.preventDefault()

        if (settings_o === undefined) {
            settings_o = {}
        }
        settings_o.host = $("#settings input[name='host']").val()
        settings_o.port = $("#settings input[name='port']").val()
        localStorage["settings"] = JSON.stringify(settings_o)
        client = gremlin.createClient(settings_o.port, settings_o.host)
        $("#settings").hide()
    }

    function query() {
        var query = $("#query").val()
        $("#result").html("")
        updateStatus("Sending "+ query)
        if (lc[lc.length - 1] != query) {
            lc.push(query)
            store()
            loadHistory()
        }
        var d = new Date()
        var st = d.getTime()
        var q = client.execute(query, function(err, result) {
                var d = new Date()
                var ft = d.getTime()
                updateStatus("Finished in "+(ft-st)/1000)
                if (err) {
                    msg = err
                    console.log(err)
                    $("#result").append($("<div> style='color: red;'></div>").text(err))
                } else {
                    var resultElem = $("#result")
                    if (typeof(result) == "object") {
                        $(resultElem).append($("<pre></pre>").text(JSON.stringify(result, null, 2)))
                    } else {
                        $(resultElem).append($("<div></div>").text(result))
                    }
                }        
        })
    }

    function loadMoreHistory(e) {
        e.preventDefault()
        loadHistory(last_loaded+1)

    }
})
