const { db } = require("../../mysql");
const fs = require('fs').promises;
const path = require('path');
const Decimal = require('decimal.js');
const { uploadFile, downloadFile } = require("./storage-controller");
const XLSX = require('xlsx');
const { lerXML } = require('../helpers/lerXML');

const titulos_sem_rateio = [
    { id_titulo: 125, id_plano_conta: 645, id_centro_custo: 1 },
    { id_titulo: 126, id_plano_conta: 655, id_centro_custo: 5 },
    { id_titulo: 127, id_plano_conta: 653, id_centro_custo: 5 },
    { id_titulo: 128, id_plano_conta: 650, id_centro_custo: 5 },
    { id_titulo: 300, id_plano_conta: 629, id_centro_custo: 1 },
    { id_titulo: 418, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 425, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 432, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 433, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 435, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 436, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 437, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 438, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 439, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 440, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 445, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 446, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 494, id_plano_conta: 665, id_centro_custo: 1 },
    { id_titulo: 497, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 498, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 499, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 500, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 501, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 502, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 507, id_plano_conta: 673, id_centro_custo: 7 },
    { id_titulo: 544, id_plano_conta: 673, id_centro_custo: 7 },
    { id_titulo: 608, id_plano_conta: 665, id_centro_custo: 1 },
    { id_titulo: 609, id_plano_conta: 665, id_centro_custo: 1 },
    { id_titulo: 610, id_plano_conta: 665, id_centro_custo: 1 },
    { id_titulo: 611, id_plano_conta: 651, id_centro_custo: 1 },
    { id_titulo: 612, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 613, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 614, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 615, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 616, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 617, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 618, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 619, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 620, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 621, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 622, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 623, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 624, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 625, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 626, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 627, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 628, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 629, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 630, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 631, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 632, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 633, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 634, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 635, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 636, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 637, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 638, id_plano_conta: 655, id_centro_custo: 1 },
    { id_titulo: 639, id_plano_conta: 655, id_centro_custo: 1 },
    { id_titulo: 640, id_plano_conta: 655, id_centro_custo: 1 },
    { id_titulo: 641, id_plano_conta: 421, id_centro_custo: 22 },
    { id_titulo: 642, id_plano_conta: 629, id_centro_custo: 1 },
    { id_titulo: 643, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 644, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 645, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 646, id_plano_conta: 642, id_centro_custo: 6 },
    { id_titulo: 647, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 648, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 649, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 650, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 651, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 652, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 653, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 654, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 655, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 656, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 657, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 658, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 659, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 660, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 661, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 662, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 663, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 664, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 665, id_plano_conta: 351, id_centro_custo: 24 },
    { id_titulo: 666, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 667, id_plano_conta: 629, id_centro_custo: 1 },
    { id_titulo: 668, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 669, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 670, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 671, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 672, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 673, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 674, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 675, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 676, id_plano_conta: 351, id_centro_custo: 24 },
    { id_titulo: 677, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 678, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 679, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 680, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 681, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 682, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 683, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 684, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 685, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 686, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 687, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 688, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 689, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 690, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 691, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 692, id_plano_conta: 488, id_centro_custo: 25 },
    { id_titulo: 693, id_plano_conta: 351, id_centro_custo: 24 },
    { id_titulo: 694, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 695, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 696, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 697, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 698, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 699, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 700, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 701, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 702, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 704, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 705, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 706, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 707, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 708, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 709, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 710, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 711, id_plano_conta: 485, id_centro_custo: 25 },
    { id_titulo: 712, id_plano_conta: 488, id_centro_custo: 25 },
    { id_titulo: 714, id_plano_conta: 665, id_centro_custo: 1 },
    { id_titulo: 715, id_plano_conta: 488, id_centro_custo: 25 },
    { id_titulo: 716, id_plano_conta: 488, id_centro_custo: 25 },
    { id_titulo: 725, id_plano_conta: 629, id_centro_custo: 1 },
    { id_titulo: 726, id_plano_conta: 488, id_centro_custo: 25 },
    { id_titulo: 727, id_plano_conta: 488, id_centro_custo: 25 },
    { id_titulo: 728, id_plano_conta: 488, id_centro_custo: 25 },
    { id_titulo: 729, id_plano_conta: 488, id_centro_custo: 25 },
    { id_titulo: 749, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 753, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 754, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 755, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 756, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 757, id_plano_conta: 486, id_centro_custo: 25 },
    { id_titulo: 758, id_plano_conta: 412, id_centro_custo: 25 },
    { id_titulo: 759, id_plano_conta: 411, id_centro_custo: 25 },
    { id_titulo: 770, id_plano_conta: 489, id_centro_custo: 25 },
    { id_titulo: 778, id_plano_conta: 482, id_centro_custo: 25 },
    { id_titulo: 784, id_plano_conta: 683, id_centro_custo: 9 },
    { id_titulo: 785, id_plano_conta: 480, id_centro_custo: 25 },
    { id_titulo: 788, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 789, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 790, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 791, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 792, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 793, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 801, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 802, id_plano_conta: 351, id_centro_custo: 24 },
    { id_titulo: 803, id_plano_conta: 351, id_centro_custo: 24 },
    { id_titulo: 804, id_plano_conta: 421, id_centro_custo: 22 },
    { id_titulo: 805, id_plano_conta: 480, id_centro_custo: 25 },
    { id_titulo: 806, id_plano_conta: 480, id_centro_custo: 25 },
    { id_titulo: 807, id_plano_conta: 480, id_centro_custo: 25 },
    { id_titulo: 811, id_plano_conta: 351, id_centro_custo: 24 },
    { id_titulo: 812, id_plano_conta: 351, id_centro_custo: 24 },
    { id_titulo: 813, id_plano_conta: 351, id_centro_custo: 24 },
    { id_titulo: 814, id_plano_conta: 480, id_centro_custo: 25 },
    { id_titulo: 815, id_plano_conta: 421, id_centro_custo: 22 },
    { id_titulo: 816, id_plano_conta: 480, id_centro_custo: 25 },
    { id_titulo: 817, id_plano_conta: 688, id_centro_custo: 4 },
    { id_titulo: 825, id_plano_conta: 665, id_centro_custo: 1 },
    { id_titulo: 826, id_plano_conta: 688, id_centro_custo: 4 },
    { id_titulo: 827, id_plano_conta: 421, id_centro_custo: 22 },
    { id_titulo: 828, id_plano_conta: 301, id_centro_custo: 14 },
    { id_titulo: 841, id_plano_conta: 296, id_centro_custo: 14 },
    { id_titulo: 842, id_plano_conta: 1004, id_centro_custo: 14 },
    { id_titulo: 843, id_plano_conta: 651, id_centro_custo: 1 },
    { id_titulo: 844, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 857, id_plano_conta: 629, id_centro_custo: 1 },
    { id_titulo: 858, id_plano_conta: 629, id_centro_custo: 1 },
    { id_titulo: 859, id_plano_conta: 629, id_centro_custo: 1 },
    { id_titulo: 860, id_plano_conta: 629, id_centro_custo: 1 },
    { id_titulo: 861, id_plano_conta: 629, id_centro_custo: 1 },
    { id_titulo: 862, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 863, id_plano_conta: 651, id_centro_custo: 1 },
    { id_titulo: 864, id_plano_conta: 651, id_centro_custo: 1 },
    { id_titulo: 865, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 866, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 867, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 868, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 869, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 870, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 871, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 903, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 904, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 905, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 906, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 907, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 908, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 909, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 910, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 911, id_plano_conta: 421, id_centro_custo: 22 },
    { id_titulo: 912, id_plano_conta: 629, id_centro_custo: 1 },
    { id_titulo: 913, id_plano_conta: 655, id_centro_custo: 1 },
    { id_titulo: 914, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 915, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 916, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 917, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 918, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 919, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 920, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 921, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 922, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 923, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 924, id_plano_conta: 421, id_centro_custo: 22 },
    { id_titulo: 925, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 926, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 927, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 928, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 929, id_plano_conta: 558, id_centro_custo: 3 },
    { id_titulo: 931, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 932, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 933, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 934, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 935, id_plano_conta: 350, id_centro_custo: 24 },
    { id_titulo: 936, id_plano_conta: 629, id_centro_custo: 1 },
    { id_titulo: 937, id_plano_conta: 629, id_centro_custo: 1 },
    { id_titulo: 938, id_plano_conta: 629, id_centro_custo: 1 },
    { id_titulo: 939, id_plano_conta: 629, id_centro_custo: 1 },
    { id_titulo: 940, id_plano_conta: 651, id_centro_custo: 1 },
    { id_titulo: 948, id_plano_conta: 629, id_centro_custo: 1 },
    { id_titulo: 956, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 957, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 958, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 959, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 960, id_plano_conta: 638, id_centro_custo: 1 },
    { id_titulo: 963, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 964, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 965, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 966, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 967, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 968, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 969, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 970, id_plano_conta: 556, id_centro_custo: 3 },
    { id_titulo: 971, id_plano_conta: 559, id_centro_custo: 3 },
    { id_titulo: 972, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 973, id_plano_conta: 638, id_centro_custo: 1 },
    { id_titulo: 974, id_plano_conta: 638, id_centro_custo: 1 },
    { id_titulo: 975, id_plano_conta: 638, id_centro_custo: 1 },
    { id_titulo: 978, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 979, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 980, id_plano_conta: 348, id_centro_custo: 24 },
    { id_titulo: 981, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 986, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 987, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 988, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 989, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 990, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 991, id_plano_conta: 421, id_centro_custo: 22 },
    { id_titulo: 992, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 993, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 994, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 995, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 996, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 997, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 998, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 1003, id_plano_conta: 629, id_centro_custo: 1 },
    { id_titulo: 1004, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 1005, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 1006, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 1007, id_plano_conta: 696, id_centro_custo: 4 },
    { id_titulo: 1008, id_plano_conta: 348, id_centro_custo: 24 }
]
function gerarRateio() {
    return new Promise(async (resolve, reject) => {
        let conn
        try {
            conn = await db.getConnection()
            await conn.beginTransaction()

            // obter os títulos que não possuem rateio
            // passar por cada um
            for (const titulo_array of titulos_sem_rateio) {
                const [rowTitulo] = await conn.execute(`SELECT 
                    t.id, 
                    t.id_filial,
                    t.id_rateio, 
                    t.valor,
                    (SELECT count(tr.id) FROM fin_cp_titulos_rateio tr WHERE tr.id_titulo = t.id) as qtde 
                    FROM fin_cp_titulos t 
                    LEFT JOIN filiais f ON f.id = t.id_filial
                    WHERE t.id_rateio IS NOT NULL and t.id = ?`, [titulo_array.id_titulo])
                const titulo = rowTitulo && rowTitulo[0];
                // if (!titulo) {
                //     throw new Error(`Título ${titulo_array.id_titulo} inexistente...`)
                // }
                if (titulo) {


                    // se rateio manual, então 100% para filial
                    // if (!titulo.id_rateio && titulo.qtde == 0) {
                    //     // console.log({
                    //     //     id_titulo: titulo.id,
                    //     //     id_filial: titulo.id_filial,
                    //     //     id_centro_custo: titulo_array.id_centro_custo,
                    //     //     id_plano_conta: titulo_array.id_plano_conta,
                    //     //     valor: titulo.valor,
                    //     //     percentual: 1
                    //     // });

                    //     await conn.execute(`INSERT INTO fin_cp_titulos_rateio
                    //     (id_titulo, id_filial, id_centro_custo, id_plano_conta, valor, percentual) 
                    //     VALUES (?,?,?,?,?,?)`,
                    //         [
                    //             titulo.id,
                    //             titulo.id_filial,
                    //             titulo_array.id_centro_custo,
                    //             titulo_array.id_plano_conta,
                    //             titulo.valor,
                    //             1
                    //         ])
                    // }
                    let valor_total = Decimal(titulo.valor);
                    // se rateio automático
                    if (titulo.id_rateio > 0) {
                        console.log(titulo.id);
                        await conn.execute(`DELETE FROM fin_cp_titulos_rateio WHERE id_titulo = ?`, [titulo.id])

                        const [itens_rateio] = await conn.execute(`SELECT id_filial, percentual FROM fin_rateio_itens WHERE id_rateio = ?`, [titulo.id_rateio])
                        let i = 0;
                        let soma_valor = 0;
                        let first_id_filial = null;

                        for (const item_rateio of itens_rateio) {
                            if (i == 0) {
                                first_id_filial = item_rateio.id_filial
                            }
                            const percentual = parseFloat(item_rateio.percentual)
                            const valor_item = parseFloat(titulo.valor * percentual)
                            soma_valor += valor_item;

                            await conn.execute(`INSERT INTO fin_cp_titulos_rateio
                                    (id_titulo, id_filial, id_centro_custo, id_plano_conta, valor, percentual) 
                                    VALUES (?,?,?,?,?,?)`,
                                [
                                    titulo.id,
                                    item_rateio.id_filial,
                                    titulo_array.id_centro_custo,
                                    titulo_array.id_plano_conta,
                                    (valor_item).toFixed(2),
                                    item_rateio.percentual,
                                ])
                            i++;
                        }

                        // if (first_id_filial) {
                        //     const diferenca = Decimal(valor_total - soma_valor);
                        //     const valor_restante_arredondado = (valor_total - soma_valor).toFixed(2);
                        //     const valor_restante = valor_restante_arredondado;
                        //     const percent = (Decimal(valor_restante / valor_total)).toFixed(6)
                        //     console.log({
                        //             id_titulo: titulo.id, 
                        //             valor_total,
                        //             soma_valor,
                        //             diferenca,
                        //             valor_restante_arredondado,
                        //             valor_restante, 
                        //             percent
                        //         });

                        //     await conn.execute(`UPDATE 
                        //     fin_cp_titulos_rateio 
                        //     SET 
                        //         valor = valor + ?,
                        //         percentual = percentual + ?
                        //     WHERE 
                        //         id_titulo = ? AND id_filial = ?`,
                        //         [
                        //             valor_restante,
                        //             percent,
                        //             titulo.id,
                        //             first_id_filial,
                        //         ])
                        // }
                    }
                }
            }

            await conn.commit();
            // if (conn) conn.rollback();
            resolve(true)
        } catch (error) {
            console.log(error);
            if (conn) conn.rollback();
            reject(error)
        } finally {
            if (conn) conn.release();
        }
    })
}

function removerRateio() {
    return new Promise(async (resolve, reject) => {
        let conn
        try {
            conn = await db.getConnection()
            await conn.beginTransaction()

            // obter os títulos que não possuem rateio
            // passar por cada um
            for (const titulo_array of titulos_sem_rateio) {
                const [rowTitulo] = await conn.execute(`SELECT 
                    t.id, 
                    t.id_filial,
                    t.id_rateio, 
                    t.valor,
                    (SELECT count(tr.id) FROM fin_cp_titulos_rateio tr WHERE tr.id_titulo = t.id) as qtde 
                    FROM fin_cp_titulos t 
                    LEFT JOIN filiais f ON f.id = t.id_filial
                    WHERE t.id = ?`, [titulo_array.id_titulo])
                const titulo = rowTitulo && rowTitulo[0];
                if (!titulo) {
                    throw new Error(`Título ${titulo_array.id_titulo} inexistente...`)
                }

                // se rateio automático
                if (titulo.id_rateio > 0) {
                    await conn.execute(`DELETE FROM fin_cp_titulos_rateio WHERE id_titulo = ?`, [titulo.id])
                }
            }


            await conn.commit();
            // if (conn) conn.rollback();
            resolve(true)
        } catch (error) {
            console.log(error);
            if (conn) conn.rollback();
            reject(error)
        } finally {
            if (conn) conn.release();
        }
    })
}

function readExcelFile(filePath) {
    return new Promise(async (resolve, reject) => {
        try {
            // Read the file asynchronously
            const fileBuffer = await fs.readFile(filePath);

            // Parse the buffer
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

            // Get the first sheet name
            const sheetName = workbook.SheetNames[0];

            // Get the worksheet
            const worksheet = workbook.Sheets[sheetName];

            // Convert the worksheet to JSON
            const data = XLSX.utils.sheet_to_json(worksheet);

            resolve(data)
        } catch (error) {
            reject(error)
        }
    })
}

async function writeXLSXFromJSON(jsonData, outputFilePath) {
    return new Promise(async (resolve, reject) => {
        try {
            // Criar uma nova planilha
            const worksheet = XLSX.utils.json_to_sheet(jsonData);

            // Criar um novo workbook
            const workbook = XLSX.utils.book_new();

            // Adicionar a planilha ao workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

            // Escrever o arquivo XLSX
            XLSX.writeFile(workbook, outputFilePath);
            resolve(true)

        } catch (error) {
            reject(error)
        }

    })
}

function subirEmLote(promises, size) {
    return new Promise(async (resolve, reject) => {
        try {
            const results = [];

            // Função auxiliar para processar um lote de promessas
            const processChunk = async (chunk) => {
                const chunkResults = await Promise.all(chunk);
                results.push(...chunkResults);
            };

            // Processa as promessas em lotes
            for (let i = 0; i < promises.length; i += size) {
                const chunk = promises.slice(i, i + size);
                await processChunk(chunk);
            }

            resolve(results)
        } catch (error) {
            console.log(error);
            reject(error)
        }
    })

}

function subirAnexo({ conn, row, folderName }) {
    return new Promise(async (resolve) => {
        try {
            // para cada arquivo tentar fazer o upload e pegar o id
            const { fileId, fileUrl } = await uploadFile({
                body: {
                    folderName: folderName,

                },
                file: {
                    path: path.join('public', 'temp', row.pasta, row.subpasta, row.filename),
                    mimetype: row.mimetype,
                    filename: row.filename,
                },
            })
            row.status = 'OK'
            row.obs = ''
            row.fileId = fileId
            row.fileUrl = fileUrl
            await conn.execute(`UPDATE fin_cp_titulos SET ${row.campo} = ? WHERE id = ?;`, [fileUrl, row.id_titulo])
            resolve(row)
        } catch (error) {
            row.status = 'ERRO'
            row.obs = error.message
            resolve(row)
        }
    })
}

function subirAnexosParaDrive() {
    return new Promise(async (resolve, reject) => {
        let conn;
        try {
            conn = await db.getConnection();

            const folderName = 'financeiro';
            const pathResult = path.join(process.cwd(), 'public', 'resultado_drive.xlsx')

            // ler os arquivos:
            const rows = await readExcelFile(path.join(process.cwd(), 'public', 'base.xlsx'))

            const results = []
            let i = 1;
            for (const row of rows) {
                const result = await subirAnexo({ conn, row, folderName })

                console.log(`Passamos pelo anexo ${i} de ${rows.length} ${row.filename}`)
                results.push(result)
                i++;
            }
            // const results = await subirEmLote(rows.map(row => subirAnexo({ row, folderName }), 10))

            await writeXLSXFromJSON(results, pathResult)

            resolve(true)
        } catch (error) {
            console.log(error);
            reject(error)
        } finally {
            if(conn) conn.release();
            
        }
    })
}

function lerXMLnota(req) {
    return new Promise(async (resolve, reject) => {
        try {
            const result = await lerXML(req.file.path)
            resolve(result)
        } catch (error) {
            reject(error)
            console.log(error);
        }
    })
}

async function teste(){
    try {
        await subirAnexosParaDrive()
        return true
    } catch (error) {
        return false
    }

}

module.exports = {
    gerarRateio,
    removerRateio,
    subirAnexosParaDrive,
    lerXMLnota,
    teste,
}
