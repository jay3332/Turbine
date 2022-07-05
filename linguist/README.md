# Turbine Linguist
Downloads linguist files from [GitHub Linguist](https://github.com/github/linguist) and converts them into
JavaScript-compatible JSON files.

## Usage
Build and run this crate followed by the output directory which defaults to `../frontend/public`. 
Make sure your root directory when running this is `/linguist`!

### Example
```shell
# Clone this repository first if not done already:
$ git clone https://github.com/jay3332/Turbine
$ cd Turbine

# Once you're in the repository root:
$ cd linguist # Important
$ cargo build --release
...
$ target/release/linguist
# On Windows:
$ target/release/linguist.exe

# Custom output directory:
$ target/release/linguist ../out
# On Windows:
$ target/release/linguist.exe ../out
```

If all goes well, there should be nothing logged into standard output.