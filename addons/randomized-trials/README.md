This add-on is really a meta-experiment. Specifically, it allows
you to perform randomized controlled trials on individual
pref-controlled features.  The basic idea here is that there is some
manifest of experiments, each of which corresponds to a specific pref.

The manifest consists of a list of experiments, each of which is a
JSON struct:

{
  "name" : <experiment-name>,
  "enrollment" : <fraction of the population to run this experiment>,
  "pref" : <pref to flip>,     
  "arms": [            // the experimental arms
     [<value>, <fraction>],
     [<value>, <fraction>]
  }
}

We use the client ID as a seed value for a PRF to generate two other
random variates.

- <experiment-name>-enrollment: to determine whether to enroll or not
- <experiment-name>-arm: to determine which arm

If the "enrollment" variate is less than experiment.enrollment, then
the browser is enrolled in the experiment. The "arm" variate is then
used to determine which experimental arms the browser is in (and hence
which prefs to flip). Prefs are set as default prefs, so they do not
survive a given run, but because the variates are consistent for a
given browser, you get consistent enrollment.



