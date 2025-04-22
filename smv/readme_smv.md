# Othello Verification - SMV Implementation
*Chang Li*

### Commands
State space explosion experiment of the original model:
```
nuXmv othello_16.smv
nuXmv -bmc othello_16.smv
nuXmv -int othello_16.smv
```

State space explosion experiment with solution one (failed attempt):
```
nuXmv -int othello_16_disableflip.smv
go
pick_state -v
simulate -v -k 1
simulate -v -k 2
simulate -v -k 3
```

Final solution (main results):
```
nuXmv -int othello_16_onedir_disableflip.smv
go
build_boolean_model
bmc_setup
check_ltlspec_bmc -k 5 -n 1
// or:
nuXmv -int othello_16_onedir_disableflip.smv
go
pick_state -v
simulate -v -k 1
simulate -v -k 2
simulate -v -k 3
```


### Acknowledgement
ChatGPT o3-mini-high is utilized for debugging nuXmv code.


