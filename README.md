a-swig-service
=========

=========

### Getting Started

1. First install [rock](http://www.rockstack.org/)

2. Clone the [the service](https://github.com/shutterstock/a-swig-service) and run:

  ```
    rock build
  ```

3. Run it

  ```
  rock run_web \
    --templates=../path/to/views \
    --translations=../path/to/translation/file.json \
    --workers=2
  ```

##### Perl/Dancer

There is a Perl client and a [Dancer wrapper](https://github.com/logie17/Dancer-Plugin-Swig) for the [client](https://github.com/shutterstock/perl-webservice-swigclient). 

1. Install the swig plugin:

  ```bash
    cpanm Dancer::Plugin::Swig
  ```

2. Update the environment/*.yml

  ```yaml
    plugins:
      Swig:
        service_url: "http://localhost:21060"
  ```

3.Create a view

  ```html
    echo "{{ hello_world }}" >> ./views/index.html
  ```

4. Modify the Dancer application

```perl
  package NewApp;
  use Dancer ':syntax';
  use Dancer::Plugin::Swig;

  our $VERSION = '0.1';

  get '/' => sub {
    render 'index.html', { hello_world => 'howdy' };
  };

  true;
```

#### Ruby/Sinatra

There is a [Ruby client](https://github.com/shutterstock/ruby-webservice-swigclient) and [Sinatra wrapper.](https://github.com/logie17/sinatra-swig)

#### Python

Yet to be developed

#### PHP

Yet to be developed

## License

[MIT](LICENSE) © 2010-2017 Shutterstock Images, LLC
